import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt, randomUUID } from 'node:crypto';
import { In, IsNull, QueryFailedError, Repository } from 'typeorm';

import { isPastUseBy } from '../common/expiry/expiry.view.js';
import type { AuthenticatedUser } from '../common/interfaces/index.js';
import {
  assertDonationParty,
  resolveScope,
} from '../common/scoping/org-scope.js';
import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import { Contact } from '../contacts/entities/contact.entity.js';
import { DonationReceiptsService } from '../donation-receipts/donation-receipts.service.js';
import type { DonationReceiptCreatedResponseDto } from '../donation-receipts/dto/index.js';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity.js';
import { InventoryItemStatus } from '../inventory-items/enums/inventory-item-status.enum.js';
import { Partnership } from '../partnerships/entities/partnership.entity.js';
import { PartnershipStatus } from '../partnerships/enums/partnership-status.enum.js';
import {
  DEFAULT_PAGE_SIZE,
  PageMetaDto,
  PaginatedResponseDto,
} from '../common/dto/index.js';
import { Location } from '../locations/entities/location.entity.js';
import {
  AcceptDonationDto,
  AddDonationLinesDto,
  CancelDonationDto,
  ConfirmDonationDto,
  CreateDonationDto,
  DeclineDonationDto,
  DonationCreatedResponseDto,
  DonationResponseDto,
  OfferDonationDto,
  PickupTokenResponseDto,
  QueryDonationsDto,
  UpdateDonationDto,
  VerifiedRecipientDto,
  VerifiedSummaryDto,
  VerifyPickupTokenResponseDto,
} from './dto/index.js';
import { DonationSort } from './dto/query-donations.dto.js';
import { DonationOrigin } from './enums/donation-origin.enum.js';
import { DonationLine } from './entities/donation-line.entity.js';
import { Donation } from './entities/donation.entity.js';
import { PickupToken } from './entities/pickup-token.entity.js';
import { DonationStatus } from './enums/donation-status.enum.js';

const PICKUP_TOKEN_TTL_HOURS = 6;

/**
 * What a donation needs loaded to be displayable.
 *
 * Every list on both sides names who is collecting, from where, and in which
 * window, so each of these would otherwise be a request per row.
 */
const DISPLAY_RELATIONS = {
  recipient: true,
  location: true,
  recipientVehicle: true,
  driverContact: true,
} as const;

/** Statuses in which a branch's donation is still accepting more stock. */
const OPEN_BASKET_STATUSES = [
  DonationStatus.DRAFT,
  DonationStatus.OFFERED,
  DonationStatus.ACCEPTED,
];
const PICKUP_PIN_DIGITS = 6;
const PICKUP_PIN_ATTEMPTS = 8;
/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = '23505';

/** Which states each transition may be applied from. */
const ALLOWED_FROM: Record<string, DonationStatus[]> = {
  edit: [DonationStatus.DRAFT],
  addLines: [DonationStatus.DRAFT, DonationStatus.ACCEPTED],
  offer: [DonationStatus.DRAFT, DonationStatus.DECLINED],
  accept: [DonationStatus.OFFERED],
  decline: [DonationStatus.OFFERED],
  readyForPickup: [DonationStatus.ACCEPTED],
  enRoute: [DonationStatus.READY_FOR_PICKUP],
  issueToken: [
    DonationStatus.ACCEPTED,
    DonationStatus.READY_FOR_PICKUP,
    DonationStatus.DRIVER_EN_ROUTE,
  ],
  confirm: [DonationStatus.READY_FOR_PICKUP, DonationStatus.DRIVER_EN_ROUTE],
  cancel: [
    DonationStatus.DRAFT,
    DonationStatus.OFFERED,
    DonationStatus.ACCEPTED,
    DonationStatus.DECLINED,
    DonationStatus.READY_FOR_PICKUP,
    DonationStatus.DRIVER_EN_ROUTE,
  ],
  remove: [DonationStatus.DRAFT, DonationStatus.CANCELLED],
};

/**
 * Business logic for donations — the two-sided handover at the centre of the
 * product. Implements {@link CrudRepository} so the "find a valid record or
 * throw" contract is the same across modules.
 *
 * The retailer offers and stages; the recipient accepts, declines and sets off.
 * Totals are recomputed from the lines while a donation is open and frozen once
 * it is `DELIVERED`, because a certificate has been issued against them.
 */
@Injectable()
export class DonationsService implements CrudRepository<Donation> {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonationLine)
    private readonly lineRepository: Repository<DonationLine>,
    @InjectRepository(PickupToken)
    private readonly tokenRepository: Repository<PickupToken>,
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(Partnership)
    private readonly partnershipRepository: Repository<Partnership>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    private readonly donationReceiptsService: DonationReceiptsService,
  ) {}

  /**
   * Finds a Donation by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the donation to look up.
   * @returns A Promise that resolves with the donation found.
   * @throws NotFoundException If it does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<Donation> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid Donation ID: ${id}`);
    }

    const donation = await this.donationRepository.findOne({
      where: { id: uuid },
    });

    if (!donation) {
      throw new NotFoundException(
        `Donation with ID: ${id} not found or not valid`,
      );
    }

    return donation;
  }

  /**
   * Retrieves every donation, newest first, without their lines.
   * @returns A Promise that resolves with all donations mapped to DonationResponseDto.
   */
  async findAll(caller: AuthenticatedUser): Promise<DonationResponseDto[]> {
    const scope = resolveScope(caller);

    const donations = await this.donationRepository.find({
      where: scope.isAdmin
        ? {}
        : scope.retailerId
          ? { retailerId: scope.retailerId }
          : { recipientId: scope.recipientId ?? undefined },
      relations: DISPLAY_RELATIONS,
      order: { createdAt: 'DESC' },
    });

    return donations.map((donation) => new DonationResponseDto(donation));
  }

  /**
   * Retrieves a single donation with its lines.
   * @param id The ID of the donation to look up.
   * @returns A Promise that resolves with the donation mapped to DonationResponseDto.
   * @throws NotFoundException If the donation is not found.
   */
  async findOne(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<DonationResponseDto> {
    const donation = await this.findValidWithLines(id);

    assertDonationParty(caller, donation);

    return new DonationResponseDto(donation);
  }

  /**
   * Retrieves one branch's donations, optionally narrowed to a single status.
   * @param locationId The ID of the branch.
   * @param status Only return donations in this state, when given.
   * @returns A Promise that resolves with the donations mapped to DonationResponseDto.
   */
  async findAllByLocation(
    locationId: string,
    status?: DonationStatus,
  ): Promise<DonationResponseDto[]> {
    const donations = await this.donationRepository.find({
      where: status ? { locationId, status } : { locationId },
      relations: DISPLAY_RELATIONS,
      order: { createdAt: 'DESC' },
    });

    return donations.map((donation) => new DonationResponseDto(donation));
  }

  /**
   * Retrieves one recipient's donations — the recipient app's inbox.
   * @param recipientId The ID of the recipient.
   * @param status Only return donations in this state, when given.
   * @returns A Promise that resolves with the donations mapped to DonationResponseDto.
   */
  async findAllByRecipient(
    recipientId: string,
    status?: DonationStatus,
  ): Promise<DonationResponseDto[]> {
    const donations = await this.donationRepository.find({
      where: status ? { recipientId, status } : { recipientId },
      relations: DISPLAY_RELATIONS,
      order: { createdAt: 'DESC' },
    });

    return donations.map((donation) => new DonationResponseDto(donation));
  }

  /**
   * Opens a donation as a `DRAFT`, optionally reserving stock lots immediately.
   * @param createDonationDto The parties, the proposed time and any initial lots.
   * @param caller The authenticated retailer-side user, when there is one.
   * @returns A Promise that resolves with the created donation and a success message.
   * @throws BadRequestException If the recipient is not an active partner, or a
   * lot is unavailable or belongs to another branch.
   */
  async create(
    createDonationDto: CreateDonationDto,
    caller?: AuthenticatedUser,
  ): Promise<DonationCreatedResponseDto> {
    const {
      retailerId,
      locationId,
      recipientId,
      pickupWindowStart,
      pickupWindowEnd,
      inventoryItemIds,
    } = createDonationDto;

    await this.assertActivePartnership(retailerId, recipientId);

    const donation = await this.donationRepository.save(
      this.donationRepository.create({
        code: await this.nextDonationCode(),
        retailerId,
        locationId,
        recipientId,
        status: DonationStatus.DRAFT,
        createdByUserId: caller?.id ?? null,
        pickupWindowStart: pickupWindowStart
          ? new Date(pickupWindowStart)
          : null,
        pickupWindowEnd: pickupWindowEnd ? new Date(pickupWindowEnd) : null,
      }),
    );

    if (inventoryItemIds?.length) {
      await this.attachLines(donation, inventoryItemIds);
    }

    return new DonationCreatedResponseDto(
      await this.findValidWithLines(donation.id),
      'Donation created successfully.',
    );
  }

  /**
   * Changes the parties or proposed time of a draft donation.
   * @param id The ID of the donation to update.
   * @param updateDonationDto The new values.
   * @returns A Promise that resolves with the updated donation and a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If the donation is no longer a draft, or the new
   * recipient is not an active partner.
   */
  async update(
    id: string,
    updateDonationDto: UpdateDonationDto,
  ): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'edit');

    const {
      recipientId,
      pickupWindowStart,
      pickupWindowEnd,
      inventoryItemIds,
      ...rest
    } = updateDonationDto;

    if (recipientId && recipientId !== donation.recipientId) {
      await this.assertActivePartnership(donation.retailerId, recipientId);
      donation.recipientId = recipientId;
    }

    Object.assign(donation, rest);

    if (pickupWindowStart !== undefined) {
      donation.pickupWindowStart = pickupWindowStart
        ? new Date(pickupWindowStart)
        : null;
    }

    if (pickupWindowEnd !== undefined) {
      donation.pickupWindowEnd = pickupWindowEnd
        ? new Date(pickupWindowEnd)
        : null;
    }

    await this.donationRepository.save(donation);

    if (inventoryItemIds?.length) {
      await this.attachLines(donation, inventoryItemIds);
    }

    return new DonationCreatedResponseDto(
      await this.findValidWithLines(donation.id),
      'Donation updated successfully.',
    );
  }

  /**
   * Puts more stock lots into an open donation.
   * @param id The ID of the donation.
   * @param addDonationLinesDto The lots to add.
   * @returns A Promise that resolves with the updated donation and a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If the donation is past staging, or a lot is
   * unavailable or belongs to another branch.
   */
  async addLines(
    id: string,
    addDonationLinesDto: AddDonationLinesDto,
  ): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'addLines');
    await this.attachLines(donation, addDonationLinesDto.inventoryItemIds);

    return new DonationCreatedResponseDto(
      await this.findValidWithLines(donation.id),
      'Inventory items added to the donation.',
    );
  }

  /**
   * Takes one line back out of an open donation, releasing its stock lot.
   * @param id The ID of the donation.
   * @param lineId The ID of the line to remove.
   * @returns A Promise that resolves with the updated donation and a success message.
   * @throws NotFoundException If the donation or the line is not found.
   * @throws BadRequestException If the donation is past staging.
   */
  async removeLine(
    id: string,
    lineId: string,
  ): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'addLines');

    const line = await this.lineRepository.findOne({
      where: { id: lineId, donationId: donation.id },
    });

    if (!line) {
      throw new NotFoundException(
        `Line with ID: ${lineId} not found on this donation`,
      );
    }

    if (line.inventoryItemId) {
      await this.inventoryItemRepository.update(line.inventoryItemId, {
        status: InventoryItemStatus.IN_INVENTORY,
        donationId: null,
        queuedAt: null,
      });
    }

    await this.lineRepository.remove(line);
    await this.recomputeTotals(donation.id);

    return new DonationCreatedResponseDto(
      await this.findValidWithLines(donation.id),
      'Inventory item removed from the donation.',
    );
  }

  /**
   * Sends a donation to the recipient for an answer.
   * @param id The ID of the donation.
   * @param offerDonationDto An optional revised pickup time.
   * @returns A Promise that resolves with the offered donation and a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it cannot be offered from its current state, or has no lines.
   */
  async offer(
    id: string,
    offerDonationDto: OfferDonationDto,
  ): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'offer');

    if (donation.lineCount === 0) {
      throw new BadRequestException(
        'A donation cannot be offered before it has at least one inventory item.',
      );
    }

    donation.status = DonationStatus.OFFERED;
    donation.offeredAt = new Date();
    donation.declinedAt = null;
    donation.declineReason = null;

    if (offerDonationDto.pickupWindowStart) {
      donation.pickupWindowStart = new Date(offerDonationDto.pickupWindowStart);
    }

    if (offerDonationDto.pickupWindowEnd) {
      donation.pickupWindowEnd = new Date(offerDonationDto.pickupWindowEnd);
    }

    await this.donationRepository.save(donation);

    return new DonationCreatedResponseDto(
      donation,
      'Donation offered to the recipient.',
    );
  }

  /**
   * Records the recipient taking on an offered donation.
   * @param id The ID of the donation.
   * @param acceptDonationDto The collecting vehicle, driver and workable time.
   * @param caller The authenticated recipient-side user.
   * @returns A Promise that resolves with the accepted donation and a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it was not offered.
   */
  async accept(
    id: string,
    acceptDonationDto: AcceptDonationDto,
    caller: AuthenticatedUser,
  ): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'accept');

    const {
      recipientVehicleId,
      driverContactId,
      pickupWindowStart,
      pickupWindowEnd,
    } = acceptDonationDto;

    donation.status = DonationStatus.ACCEPTED;
    donation.acceptedAt = new Date();
    donation.acceptedByUserId = caller.id;

    if (recipientVehicleId !== undefined) {
      donation.recipientVehicleId = recipientVehicleId;
    }

    if (driverContactId !== undefined) {
      donation.driverContactId = driverContactId;
    }

    if (pickupWindowStart) {
      donation.pickupWindowStart = new Date(pickupWindowStart);
    }

    if (pickupWindowEnd) {
      donation.pickupWindowEnd = new Date(pickupWindowEnd);
    }

    await this.donationRepository.save(donation);

    return new DonationCreatedResponseDto(
      donation,
      'Donation accepted successfully.',
    );
  }

  /**
   * Records the recipient turning down an offered donation, so the retailer can
   * offer it to somebody else.
   * @param id The ID of the donation.
   * @param declineDonationDto Why it was turned down.
   * @param caller The authenticated recipient-side user.
   * @returns A Promise that resolves with the declined donation and a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it was not offered.
   */
  async decline(
    id: string,
    declineDonationDto: DeclineDonationDto,
    caller: AuthenticatedUser,
  ): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'decline');

    donation.status = DonationStatus.DECLINED;
    donation.declinedAt = new Date();
    donation.declineReason = declineDonationDto.declineReason;
    donation.acceptedAt = null;
    donation.acceptedByUserId = null;
    void caller;

    await this.donationRepository.save(donation);

    return new DonationCreatedResponseDto(
      donation,
      'Donation declined. The retailer can now offer it elsewhere.',
    );
  }

  /**
   * Marks the goods physically staged and waiting for the driver.
   * @param id The ID of the donation.
   * @returns A Promise that resolves with the donation and a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it has not been accepted.
   */
  async markReadyForPickup(id: string): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'readyForPickup');

    donation.status = DonationStatus.READY_FOR_PICKUP;
    await this.donationRepository.save(donation);

    return new DonationCreatedResponseDto(
      donation,
      'Donation is ready for pickup.',
    );
  }

  /**
   * Records the recipient's driver setting off.
   * @param id The ID of the donation.
   * @returns A Promise that resolves with the donation and a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it is not ready for pickup.
   */
  async markDriverEnRoute(id: string): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'enRoute');

    donation.status = DonationStatus.DRIVER_EN_ROUTE;
    await this.donationRepository.save(donation);

    return new DonationCreatedResponseDto(donation, 'Driver is en route.');
  }

  /**
   * Issues a single-use pickup token for the recipient to present as a QR code.
   * Any token already outstanding for the donation is consumed, so only the
   * newest one works.
   * @param id The ID of the donation.
   * @returns A Promise that resolves with the issued token.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If the donation is not awaiting collection.
   */
  async issuePickupToken(id: string): Promise<PickupTokenResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'issueToken');

    await this.tokenRepository.update(
      { donationId: donation.id, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );

    const token = await this.saveTokenWithFreshPin(donation.id);

    return new PickupTokenResponseDto(token);
  }

  /**
   * Returns the token the recipient is currently meant to present.
   *
   * Distinct from issuing one: the recipient app opens its pass repeatedly, and
   * minting a fresh code each time would invalidate the one already on screen.
   * @param id The ID of the donation.
   * @returns A Promise that resolves with the outstanding token.
   * @throws NotFoundException If the donation is not found, or has no
   * outstanding token.
   */
  async findCurrentPickupToken(id: string): Promise<PickupTokenResponseDto> {
    const donation = await this.findValid(id);

    const token = await this.tokenRepository.findOne({
      where: { donationId: donation.id, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!token) {
      throw new NotFoundException(
        'This donation has no outstanding pickup token. Issue one first.',
      );
    }

    return new PickupTokenResponseDto(token);
  }

  /**
   * Inserts a token, retrying until its PIN does not collide.
   *
   * The PIN is only unique among unconsumed tokens, so the space stays small
   * enough to be keyed by hand while a spent PIN can be handed out again.
   * @param donationId The donation the token releases.
   * @returns A Promise that resolves with the stored token.
   * @throws BadRequestException If no free PIN was found in several attempts.
   */
  private async saveTokenWithFreshPin(
    donationId: string,
  ): Promise<PickupToken> {
    for (let attempt = 0; attempt < PICKUP_PIN_ATTEMPTS; attempt += 1) {
      try {
        return await this.tokenRepository.save(
          this.tokenRepository.create({
            donationId,
            code: `PT-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
            pin: String(randomInt(0, 10 ** PICKUP_PIN_DIGITS)).padStart(
              PICKUP_PIN_DIGITS,
              '0',
            ),
            expiresAt: new Date(
              Date.now() + PICKUP_TOKEN_TTL_HOURS * 60 * 60 * 1000,
            ),
          }),
        );
      } catch (error) {
        if (
          !(error instanceof QueryFailedError) ||
          (error.driverError as { code?: string }).code !== UNIQUE_VIOLATION
        ) {
          throw error;
        }
      }
    }

    throw new BadRequestException(
      'Could not allocate a free pickup PIN. Please try again.',
    );
  }

  /**
   * Completes a handover: verifies the token the recipient presented, marks the
   * stock donated, freezes the totals and issues the certificate.
   * @param id The ID of the donation.
   * @param confirmDonationDto The token code that was scanned.
   * @param caller The authenticated retailer-side user doing the scanning.
   * @returns A Promise that resolves with the issued certificate.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If the donation is not awaiting collection, or the
   * token is unknown, expired, already used, or belongs to another donation.
   */
  async confirm(
    id: string,
    confirmDonationDto: ConfirmDonationDto,
    caller: AuthenticatedUser,
  ): Promise<DonationReceiptCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'confirm');

    const presented = confirmDonationDto.pickupTokenCode.trim();

    const token = await this.tokenRepository.findOne({
      where: [{ code: presented }, { pin: presented, consumedAt: IsNull() }],
    });

    if (!token || token.donationId !== donation.id) {
      throw new BadRequestException(
        'This pickup token does not belong to this donation.',
      );
    }

    if (token.consumedAt) {
      throw new BadRequestException('This pickup token has already been used.');
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('This pickup token has expired.');
    }

    const completedAt = new Date();

    token.consumedAt = completedAt;
    token.consumedByUserId = caller.id;
    await this.tokenRepository.save(token);

    await this.inventoryItemRepository.update(
      { donationId: donation.id },
      { status: InventoryItemStatus.DONATED },
    );

    donation.status = DonationStatus.DELIVERED;
    donation.completedAt = completedAt;
    donation.confirmedByUserId = caller.id;
    await this.donationRepository.save(donation);

    const loaded = await this.donationRepository.findOne({
      where: { id: donation.id },
      relations: {
        retailer: true,
        location: true,
        recipient: true,
        recipientVehicle: true,
        driverContact: true,
      },
    });

    return await this.donationReceiptsService.issueForDonation(
      loaded ?? donation,
      {
        authorizedByName: await this.resolveAuthorizedByName(
          caller.id,
          loaded ?? donation,
          confirmDonationDto.authorizedByLabel,
        ),
        driverName: loaded?.driverContact?.fullName ?? null,
        receivedByLabel:
          confirmDonationDto.receivedByLabel ??
          loaded?.driverContact?.fullName ??
          null,
        verificationCode: token.code,
        handoverPin: token.pin,
      },
    );
  }

  /**
   * Calls off a donation and releases every lot back to inventory. Covers a
   * driver no-show.
   * @param id The ID of the donation.
   * @param cancelDonationDto Why it was called off.
   * @returns A Promise that resolves with the cancelled donation and a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it has already been delivered or cancelled.
   */
  async cancel(
    id: string,
    cancelDonationDto: CancelDonationDto,
    caller?: AuthenticatedUser,
  ): Promise<DonationCreatedResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'cancel');

    await this.releaseItems(donation.id);

    donation.status = DonationStatus.CANCELLED;
    donation.cancelledAt = new Date();
    donation.cancellationReason = cancelDonationDto.cancellationReason;
    donation.cancellationReasonCode =
      cancelDonationDto.cancellationReasonCode ?? null;
    donation.cancelledByUserId = caller?.id ?? null;
    await this.donationRepository.save(donation);

    return new DonationCreatedResponseDto(
      donation,
      'Donation cancelled successfully.',
    );
  }

  /**
   * Soft-deletes a donation that never went anywhere, releasing its lots.
   * @param id The ID of the donation to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the donation is not found.
   * @throws BadRequestException If it is anything other than a draft or cancelled.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const donation = await this.findValid(id);

    this.assertTransition(donation, 'remove');

    await this.releaseItems(donation.id);
    await this.donationRepository.softRemove(donation);

    return new MessageResponseDto('Donation deleted successfully.');
  }

  /**
   * Loads a donation together with its lines.
   * @param id The ID of the donation.
   * @returns A Promise that resolves with the donation and its lines.
   * @throws NotFoundException If the donation is not found.
   */
  private async findValidWithLines(id: string): Promise<Donation> {
    await this.findValid(id);

    const donation = await this.donationRepository.findOne({
      where: { id },
      relations: { ...DISPLAY_RELATIONS, lines: true },
    });

    if (!donation) {
      throw new NotFoundException(`Donation with ID: ${id} not found`);
    }

    return donation;
  }

  /**
   * Rejects a transition the donation's current state does not allow.
   * @param donation The donation being changed.
   * @param transition The transition key to check.
   * @throws BadRequestException If the current status does not permit it.
   */
  private assertTransition(donation: Donation, transition: string): void {
    const allowed = ALLOWED_FROM[transition] ?? [];

    if (!allowed.includes(donation.status)) {
      throw new BadRequestException(
        `A donation with status ${donation.status} does not allow this action. Allowed from: ${allowed.join(', ')}.`,
      );
    }
  }

  /**
   * Checks the retailer actually works with the recipient, which is what replaces
   * the demo's hardcoded first-partner-in-the-list.
   * @param retailerId The retailer offering.
   * @param recipientId The recipient being offered to.
   * @throws BadRequestException If there is no active partnership between them.
   */
  private async assertActivePartnership(
    retailerId: string,
    recipientId: string,
  ): Promise<void> {
    const partnership = await this.partnershipRepository.findOne({
      where: { retailerId, recipientId, status: PartnershipStatus.ACTIVE },
    });

    if (!partnership) {
      throw new BadRequestException(
        'This recipient is not an active partner of this retailer.',
      );
    }
  }

  /**
   * Snapshots stock lots onto the donation as lines and reserves them.
   * @param donation The donation to attach to.
   * @param inventoryItemIds The lots to attach.
   * @throws BadRequestException If a lot is missing, unavailable, or belongs to
   * another branch.
   */
  private async attachLines(
    donation: Donation,
    inventoryItemIds: string[],
  ): Promise<void> {
    const items = await this.inventoryItemRepository.find({
      where: { id: In(inventoryItemIds) },
      relations: { product: true },
    });

    if (items.length !== inventoryItemIds.length) {
      throw new BadRequestException(
        'One or more inventory items could not be found.',
      );
    }

    for (const item of items) {
      if (item.locationId !== donation.locationId) {
        throw new BadRequestException(
          `Inventory item ${item.id} belongs to a different branch than this donation.`,
        );
      }

      if (item.status !== InventoryItemStatus.IN_INVENTORY) {
        throw new BadRequestException(
          `Inventory item ${item.id} is not available; its status is ${item.status}.`,
        );
      }

      // Stopped on the retailer's own side too, not just the recipient's: the shop
      // must not be able to hand over food past a use-by date either, and a
      // certificate saying it did is exactly the record nobody wants.
      if (isPastUseBy(item)) {
        throw new BadRequestException(
          `Inventory item ${item.id} is past its use-by date and cannot be donated. Dispose of it instead.`,
        );
      }
    }

    const queuedAt = new Date();

    await this.lineRepository.save(
      items.map((item) =>
        this.lineRepository.create({
          donationId: donation.id,
          inventoryItemId: item.id,
          productName: item.product?.name ?? 'Unknown product',
          brand: item.product?.brand ?? null,
          barcode: item.product?.barcode ?? null,
          category: item.product!.category,
          quantity: item.quantity,
          unit: item.unit,
          weightKg: item.weightKg,
          retailValue: item.retailValue,
          unitPrice: item.unitPrice,
          unitLabel: item.unitLabel,
          imageUrl: item.imageUrl ?? item.product?.imageUrl ?? null,
          expiresAt: item.expiresAt,
          expiryKind: item.expiryKind,
          reason: item.reason,
          reasonDescription: item.reasonDescription,
        }),
      ),
    );

    // Taken off the shelf as well as reserved: a lot committed to one donation
    // must stop being claimable by anyone else.
    await this.inventoryItemRepository.update(
      { id: In(items.map((item) => item.id)) },
      {
        status: InventoryItemStatus.RESERVED,
        donationId: donation.id,
        isListed: false,
        queuedAt,
      },
    );

    await this.recomputeTotals(donation.id);
  }

  /**
   * Searches, filters, orders and pages the donation list.
   * @param query The filters, ordering and page.
   * @returns A Promise that resolves with one page of donations.
   */
  async search(
    query: QueryDonationsDto,
    caller: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<DonationResponseDto>> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const offset = this.decodeCursor(query.cursor);

    const builder = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.recipient', 'recipient')
      .leftJoinAndSelect('donation.location', 'location')
      .leftJoinAndSelect('donation.recipientVehicle', 'recipientVehicle')
      .leftJoinAndSelect('donation.driverContact', 'driverContact')
      .where('donation.deleted_at IS NULL');

    const scope = resolveScope(caller);

    if (scope.retailerId) {
      builder.andWhere('donation.retailer_id = :scopeRetailerId', {
        scopeRetailerId: scope.retailerId,
      });
    } else if (scope.recipientId) {
      builder.andWhere('donation.recipient_id = :scopeRecipientId', {
        scopeRecipientId: scope.recipientId,
      });
    }

    if (query.status && query.status.length > 0) {
      builder.andWhere('donation.status IN (:...statuses)', {
        statuses: query.status,
      });
    }

    if (query.origin) {
      builder.andWhere('donation.origin = :origin', { origin: query.origin });
    }

    if (query.locationId) {
      builder.andWhere('donation.location_id = :locationId', {
        locationId: query.locationId,
      });
    }

    if (query.recipientId) {
      builder.andWhere('donation.recipient_id = :recipientId', {
        recipientId: query.recipientId,
      });
    }

    if (query.from) {
      builder.andWhere('donation.created_at >= :from', {
        from: new Date(query.from),
      });
    }

    if (query.to) {
      builder.andWhere('donation.created_at < :to', { to: new Date(query.to) });
    }

    const total = await builder.getCount();

    if (query.sort === DonationSort.COMPLETED_AT_DESC) {
      builder.orderBy('donation.completed_at', 'DESC', 'NULLS LAST');
    } else if (query.sort === DonationSort.PICKUP_WINDOW_ASC) {
      builder.orderBy('donation.pickup_window_start', 'ASC', 'NULLS LAST');
    } else {
      builder.orderBy('donation.created_at', 'DESC');
    }

    const donations = await builder.skip(offset).take(limit).getMany();
    const nextOffset = offset + donations.length;

    return new PaginatedResponseDto(
      donations.map((donation) => new DonationResponseDto(donation)),
      new PageMetaDto({
        total,
        count: donations.length,
        nextCursor: nextOffset < total ? this.encodeCursor(nextOffset) : null,
      }),
    );
  }

  /**
   * Reads the branch's open donation, the retailer app's "Ready" basket.
   * @param locationId The branch.
   * @returns A Promise that resolves with the open donation, or null when there
   * is none.
   */
  async findOpenForLocation(
    locationId: string,
  ): Promise<DonationResponseDto | null> {
    const donation = await this.donationRepository.findOne({
      where: { locationId, status: In(OPEN_BASKET_STATUSES) },
      relations: { ...DISPLAY_RELATIONS, lines: true },
      order: { createdAt: 'DESC' },
    });

    return donation ? new DonationResponseDto(donation) : null;
  }

  /**
   * Adds lots to the branch's open donation, creating it when there is none.
   *
   * The retailer app's Donate, Transfer and Add All buttons are all this one
   * call. It picks the recipient itself when the caller does not: the client
   * silently defaulted to the first partner, which is a decision the server
   * should make explicitly against the active partnerships.
   * @param locationId The branch staging the stock.
   * @param inventoryItemIds The lots to stage.
   * @param recipientId The recipient to offer to, or undefined to let the server pick.
   * @param caller The authenticated retailer-side user.
   * @returns A Promise that resolves with the open donation and a message.
   * @throws NotFoundException If the branch does not exist.
   * @throws BadRequestException If no active partner can be chosen.
   */
  async addToOpenDonation(
    locationId: string,
    inventoryItemIds: string[],
    recipientId: string | undefined,
    caller?: AuthenticatedUser,
  ): Promise<DonationCreatedResponseDto> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });

    if (!location?.retailerId) {
      throw new NotFoundException('That branch was not found.');
    }

    const existing = await this.donationRepository.findOne({
      where: { locationId, status: In(OPEN_BASKET_STATUSES) },
      order: { createdAt: 'DESC' },
    });

    const donation =
      existing ??
      (await this.donationRepository.save(
        this.donationRepository.create({
          code: await this.nextDonationCode(),
          retailerId: location.retailerId,
          locationId: location.id,
          recipientId:
            recipientId ??
            (await this.pickPartnerRecipient(location.retailerId)),
          status: DonationStatus.DRAFT,
          origin: DonationOrigin.RETAILER_OFFER,
          createdByUserId: caller?.id ?? null,
        }),
      ));

    if (recipientId && recipientId !== donation.recipientId) {
      await this.assertActivePartnership(donation.retailerId, recipientId);
      donation.recipientId = recipientId;
      await this.donationRepository.save(donation);
    }

    await this.attachLines(donation, inventoryItemIds);

    return new DonationCreatedResponseDto(
      await this.findValidWithLines(donation.id),
      existing
        ? 'Lots added to the open donation.'
        : 'Donation created and lots staged.',
    );
  }

  /**
   * Resolves a presented credential to a donation, without consuming it.
   *
   * Accepts the scanned payload or the PIN. Returns a verdict rather than
   * throwing, because the scanner renders "invalid" as a screen state and a 400
   * would make every failed scan look like a client bug.
   * @param code The scanned code or keyed PIN.
   * @returns A Promise that resolves with the verdict.
   */
  async verifyPickupToken(code: string): Promise<VerifyPickupTokenResponseDto> {
    const presented = code.trim();

    const reject = (message: string): VerifyPickupTokenResponseDto =>
      new VerifyPickupTokenResponseDto({
        valid: false,
        message,
        donationId: null,
        code: null,
        recipient: null,
        summary: null,
      });

    const token = await this.tokenRepository.findOne({
      where: [{ code: presented }, { pin: presented, consumedAt: IsNull() }],
      order: { createdAt: 'DESC' },
    });

    if (!token) {
      return reject('That code does not match any pickup pass.');
    }

    if (token.consumedAt) {
      return reject('This pickup token has already been used.');
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      return reject('This pickup token has expired.');
    }

    const donation = await this.donationRepository.findOne({
      where: { id: token.donationId },
      relations: {
        recipient: { contacts: true },
        recipientVehicle: true,
        driverContact: true,
      },
    });

    if (!donation) {
      return reject('The donation behind this pass no longer exists.');
    }

    if (!ALLOWED_FROM.confirm.includes(donation.status)) {
      return reject(
        `This donation is not ready for collection; its status is ${donation.status}.`,
      );
    }

    const contact =
      donation.driverContact ??
      donation.recipient?.contacts?.find((candidate) => candidate.isPrimary) ??
      donation.recipient?.contacts?.[0] ??
      null;

    return new VerifyPickupTokenResponseDto({
      valid: true,
      message: null,
      donationId: donation.id,
      code: donation.code,
      recipient: new VerifiedRecipientDto({
        id: donation.recipientId,
        displayName: donation.recipient?.displayName ?? 'Unknown recipient',
        shortName: donation.recipient?.shortName ?? null,
        isVerified: donation.recipient?.verifiedAt != null,
        logoUrl: donation.recipient?.logoUrl ?? null,
        contactPerson: contact?.fullName ?? null,
        phone: contact?.phone ?? null,
        vehiclePlate: donation.recipientVehicle?.plate ?? null,
      }),
      summary: new VerifiedSummaryDto({
        lineCount: donation.lineCount,
        totalQuantity: donation.totalQuantity,
        totalWeightKg: donation.totalWeightKg,
        totalRetailValue: donation.totalRetailValue,
        currency: donation.currency,
        estimatedMeals: donation.estimatedMeals,
      }),
    });
  }

  /**
   * Picks the recipient a staged donation should go to.
   * @param retailerId The donating retailer.
   * @returns A Promise that resolves with the preferred active partner.
   * @throws BadRequestException If the retailer has no active partner.
   */
  private async pickPartnerRecipient(retailerId: string): Promise<string> {
    const partnership = await this.partnershipRepository.findOne({
      where: { retailerId, status: PartnershipStatus.ACTIVE },
      order: { isPreferred: 'DESC', createdAt: 'ASC' },
    });

    if (!partnership) {
      throw new BadRequestException(
        'This retailer has no active partner to donate to. Add a partnership first, or name a recipient.',
      );
    }

    return partnership.recipientId;
  }

  /**
   * Reads an offset out of an opaque cursor.
   * @param cursor The cursor from a previous page, if any.
   * @returns The offset to resume from, or 0 when absent or unreadable.
   */
  private decodeCursor(cursor?: string): number {
    if (!cursor) {
      return 0;
    }

    const offset = Number(Buffer.from(cursor, 'base64url').toString('utf8'));

    return Number.isInteger(offset) && offset >= 0 ? offset : 0;
  }

  /**
   * Wraps an offset so callers treat paging as opaque.
   * @param offset The offset to encode.
   * @returns The cursor to hand back.
   */
  private encodeCursor(offset: number): string {
    return Buffer.from(String(offset), 'utf8').toString('base64url');
  }

  /**
   * Releases every lot still reserved for a donation back to inventory.
   * @param donationId The ID of the donation.
   */
  private async releaseItems(donationId: string): Promise<void> {
    await this.inventoryItemRepository.update(
      { donationId, status: InventoryItemStatus.RESERVED },
      {
        status: InventoryItemStatus.IN_INVENTORY,
        donationId: null,
        queuedAt: null,
      },
    );
  }

  /**
   * Recomputes the stored totals from the lines. Only called while a donation is
   * open — once delivered, the totals are frozen because a certificate quotes them.
   * @param donationId The ID of the donation.
   */
  private async recomputeTotals(donationId: string): Promise<void> {
    const lines = await this.lineRepository.find({ where: { donationId } });

    await this.donationRepository.update(donationId, {
      lineCount: lines.length,
      totalQuantity: Number(
        lines.reduce((sum, line) => sum + Number(line.quantity), 0).toFixed(3),
      ),
      totalWeightKg: Number(
        lines.reduce((sum, line) => sum + Number(line.weightKg), 0).toFixed(3),
      ),
      totalRetailValue: Number(
        lines
          .reduce((sum, line) => sum + Number(line.retailValue ?? 0), 0)
          .toFixed(2),
      ),
    });
  }

  /**
   * Builds the next donation code, sequential within the year.
   * @returns A Promise that resolves with a code of the form `FR-YYYY-NNNNNN`.
   */
  private async nextDonationCode(): Promise<string> {
    const prefix = `FR-${new Date().getUTCFullYear()}-`;

    const issued = await this.donationRepository
      .createQueryBuilder('donation')
      .withDeleted()
      .where('donation.code LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();

    return `${prefix}${String(issued + 1).padStart(6, '0')}`;
  }

  /**
   * Resolves a display name for a user, which lives on their contact because
   * `user` holds credentials only.
   * @param userId The ID of the user.
   * @returns A Promise that resolves with the contact's name, or a fallback.
   */
  private async resolveAuthorizedByName(
    userId: string,
    donation: Donation,
    explicit?: string,
  ): Promise<string> {
    if (explicit) {
      return explicit;
    }

    const linked = await this.contactRepository.findOne({
      where: { userId },
    });

    if (linked) {
      return linked.fullName;
    }

    // Nothing links a login to a person, so fall back to the named contact at
    // the branch, then the retailer's. A certificate is a legal record of who
    // released the goods: a real name from the owning organization is worth more
    // than a placeholder, and "Authorised user" is the last resort rather than
    // the common case.
    const fallback = await this.contactRepository.findOne({
      where: [
        { locationId: donation.locationId },
        { retailerId: donation.retailerId },
      ],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    return fallback?.fullName ?? 'Authorised user';
  }
}
