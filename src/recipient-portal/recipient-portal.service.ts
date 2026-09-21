import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DEFAULT_PAGE_SIZE,
  MessageResponseDto,
  PageMetaDto,
  PaginatedResponseDto,
} from '../common/dto/index.js';
import type { AuthenticatedUser } from '../common/interfaces/index.js';
import { resolvePeriod } from '../common/period/index.js';
import { resolveScope } from '../common/scoping/index.js';
import {
  ContactResponseDto,
  CreateContactDto,
  UpdateContactDto,
} from '../contacts/dto/index.js';
import { Contact } from '../contacts/entities/contact.entity.js';
import { DonationReceiptResponseDto } from '../donation-receipts/dto/index.js';
import { DonationReceipt } from '../donation-receipts/entities/donation-receipt.entity.js';
import { Donation } from '../donations/entities/donation.entity.js';
import { DonationStatus } from '../donations/enums/donation-status.enum.js';
import { ImpactFactorsService } from '../impact-factors/impact-factors.service.js';
import { ImpactService } from '../impact/impact.service.js';
import { Location } from '../locations/entities/location.entity.js';
import {
  ImpactFactorSummaryDto,
  ImpactReportResponseDto,
} from '../retailer-portal/dto/index.js';
import {
  RecipientResponseDto,
  UpdateRecipientDto,
} from '../recipients/dto/index.js';
import { Recipient } from '../recipients/entities/recipient.entity.js';
import {
  PartnerLocationResponseDto,
  UpdateNotificationPreferencesDto,
  VerificationPassResponseDto,
} from './dto/index.js';

/**
 * The recipient app's own-organization surfaces: profile, staff, preferences,
 * collection history and impact.
 *
 * Every method resolves the organization from the token rather than a path
 * parameter, which is what makes `/recipients/me/...` safe to expose: there is
 * no id for a caller to substitute.
 */
@Injectable()
export class RecipientPortalService {
  constructor(
    @InjectRepository(Recipient)
    private readonly recipientRepository: Repository<Recipient>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonationReceipt)
    private readonly receiptRepository: Repository<DonationReceipt>,
    private readonly impactService: ImpactService,
    private readonly impactFactorsService: ImpactFactorsService,
  ) {}

  /**
   * Loads the recipient the caller acts for.
   * @param caller The authenticated caller.
   * @returns A Promise that resolves with the recipient entity.
   * @throws ForbiddenException If the caller acts for no recipient.
   * @throws NotFoundException If the recipient row has disappeared.
   */
  async resolveRecipient(caller: AuthenticatedUser): Promise<Recipient> {
    const scope = resolveScope(caller);

    if (!scope.recipientId) {
      throw new ForbiddenException(
        'This endpoint is for recipient accounts. Your account acts for no recipient.',
      );
    }

    const recipient = await this.recipientRepository.findOne({
      where: { id: scope.recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('That recipient no longer exists.');
    }

    return recipient;
  }

  /**
   * Finds the point a recipient's searches should be measured from.
   * @param recipient The recipient searching.
   * @returns A Promise that resolves with their primary coordinates, which may
   * both be null when no location has been geocoded.
   */
  async findOrigin(
    recipient: Recipient,
  ): Promise<{ latitude: number | null; longitude: number | null }> {
    const base = await this.locationRepository.findOne({
      where: { recipientId: recipient.id, isActive: true },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    return {
      latitude: base?.latitude ?? null,
      longitude: base?.longitude ?? null,
    };
  }

  /**
   * Reads the caller's own organization profile.
   * @param caller The authenticated caller.
   * @returns A Promise that resolves with the profile.
   */
  async findProfile(caller: AuthenticatedUser): Promise<RecipientResponseDto> {
    return new RecipientResponseDto(await this.resolveRecipient(caller));
  }

  /**
   * Edits the caller's own organization profile.
   * @param caller The authenticated caller.
   * @param updateRecipientDto The new values.
   * @returns A Promise that resolves with the updated profile.
   */
  async updateProfile(
    caller: AuthenticatedUser,
    updateRecipientDto: UpdateRecipientDto,
  ): Promise<RecipientResponseDto> {
    const recipient = await this.resolveRecipient(caller);

    Object.assign(recipient, updateRecipientDto);

    return new RecipientResponseDto(
      await this.recipientRepository.save(recipient),
    );
  }

  /**
   * Updates the surplus alert preferences.
   * @param caller The authenticated caller.
   * @param preferences The new preferences.
   * @returns A Promise that resolves with the updated profile.
   */
  async updateNotificationPreferences(
    caller: AuthenticatedUser,
    preferences: UpdateNotificationPreferencesDto,
  ): Promise<RecipientResponseDto> {
    const recipient = await this.resolveRecipient(caller);

    Object.assign(recipient, preferences);

    return new RecipientResponseDto(
      await this.recipientRepository.save(recipient),
    );
  }

  /**
   * Lists the organization's authorised staff.
   * @param caller The authenticated caller.
   * @returns A Promise that resolves with the contacts, primary first.
   */
  async findContacts(caller: AuthenticatedUser): Promise<ContactResponseDto[]> {
    const recipient = await this.resolveRecipient(caller);

    const contacts = await this.contactRepository.find({
      where: { recipientId: recipient.id },
      order: { isPrimary: 'DESC', fullName: 'ASC' },
    });

    return contacts.map((contact) => new ContactResponseDto(contact));
  }

  /**
   * Adds an authorised staff member to the caller's own organization.
   * @param caller The authenticated caller.
   * @param createContactDto The person to add.
   * @returns A Promise that resolves with the created contact.
   * @throws BadRequestException If the payload names another organization.
   */
  async addContact(
    caller: AuthenticatedUser,
    createContactDto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    const recipient = await this.resolveRecipient(caller);

    if (
      createContactDto.retailerId ||
      (createContactDto.recipientId &&
        createContactDto.recipientId !== recipient.id)
    ) {
      throw new BadRequestException(
        'This endpoint only adds staff to your own organization.',
      );
    }

    const contact = await this.contactRepository.save(
      this.contactRepository.create({
        ...createContactDto,
        retailerId: null,
        recipientId: recipient.id,
      }),
    );

    return new ContactResponseDto(contact);
  }

  /**
   * Edits one of the organization's staff members.
   * @param caller The authenticated caller.
   * @param id The contact to edit.
   * @param updateContactDto The new values.
   * @returns A Promise that resolves with the updated contact.
   * @throws NotFoundException If the contact is not theirs.
   */
  async updateContact(
    caller: AuthenticatedUser,
    id: string,
    updateContactDto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    const contact = await this.findOwnContact(caller, id);

    Object.assign(contact, updateContactDto, {
      retailerId: null,
      recipientId: contact.recipientId,
    });

    return new ContactResponseDto(await this.contactRepository.save(contact));
  }

  /**
   * Removes one of the organization's staff members.
   *
   * Refuses to remove the last one: an organization with no reachable person
   * cannot be handed goods, and the app only guarded this client-side.
   * @param caller The authenticated caller.
   * @param id The contact to remove.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the contact is not theirs.
   * @throws ConflictException If it is the only one left.
   */
  async removeContact(
    caller: AuthenticatedUser,
    id: string,
  ): Promise<MessageResponseDto> {
    const contact = await this.findOwnContact(caller, id);

    const remaining = await this.contactRepository.count({
      where: { recipientId: contact.recipientId as string },
    });

    if (remaining <= 1) {
      throw new ConflictException(
        'Your organization must keep at least one authorised contact.',
      );
    }

    await this.contactRepository.softDelete(contact.id);

    return new MessageResponseDto('Authorised contact removed successfully.');
  }

  /**
   * Lists the recipient's completed collections, newest first.
   * @param caller The authenticated caller.
   * @param locationId Narrow to one store.
   * @param from Inclusive lower bound on the completion date.
   * @param to Exclusive upper bound on the completion date.
   * @param limit How many to return.
   * @param cursor Where to resume.
   * @returns A Promise that resolves with one page of certificates.
   */
  async findPickups(
    caller: AuthenticatedUser,
    locationId?: string,
    from?: string,
    to?: string,
    limit = DEFAULT_PAGE_SIZE,
    cursor?: string,
  ): Promise<PaginatedResponseDto<DonationReceiptResponseDto>> {
    const recipient = await this.resolveRecipient(caller);
    const offset = this.decodeCursor(cursor);

    const builder = this.receiptRepository
      .createQueryBuilder('receipt')
      .innerJoin('receipt.donation', 'donation')
      .where('donation.recipient_id = :recipientId', {
        recipientId: recipient.id,
      })
      .andWhere('donation.deleted_at IS NULL');

    if (locationId) {
      builder.andWhere('donation.location_id = :locationId', { locationId });
    }

    if (from) {
      builder.andWhere('receipt.issued_at >= :from', { from: new Date(from) });
    }

    if (to) {
      builder.andWhere('receipt.issued_at < :to', { to: new Date(to) });
    }

    const total = await builder.getCount();

    const receipts = await builder
      .orderBy('receipt.issued_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const nextOffset = offset + receipts.length;

    return new PaginatedResponseDto(
      receipts.map((receipt) => new DonationReceiptResponseDto(receipt)),
      new PageMetaDto({
        total,
        count: receipts.length,
        nextCursor: nextOffset < total ? this.encodeCursor(nextOffset) : null,
      }),
    );
  }

  /**
   * Lists the stores this recipient has actually collected from.
   * @param caller The authenticated caller.
   * @returns A Promise that resolves with the stores and their pickup counts.
   */
  async findPartnerLocations(
    caller: AuthenticatedUser,
  ): Promise<PartnerLocationResponseDto[]> {
    const recipient = await this.resolveRecipient(caller);

    const rows = await this.donationRepository
      .createQueryBuilder('donation')
      .innerJoin('donation.location', 'location')
      .innerJoin('location.retailer', 'retailer')
      .select('location.id', 'locationId')
      .addSelect('location.label', 'label')
      .addSelect('location.neighborhood', 'neighborhood')
      .addSelect(
        'COALESCE(retailer.trade_name, retailer.legal_name)',
        'retailerName',
      )
      .addSelect('COUNT(*)', 'pickupCount')
      .where('donation.deleted_at IS NULL')
      .andWhere('donation.recipient_id = :recipientId', {
        recipientId: recipient.id,
      })
      .andWhere('donation.status = :status', {
        status: DonationStatus.DELIVERED,
      })
      .groupBy('location.id')
      .addGroupBy('location.label')
      .addGroupBy('location.neighborhood')
      .addGroupBy('retailer.trade_name')
      .addGroupBy('retailer.legal_name')
      .orderBy('"pickupCount"', 'DESC')
      .getRawMany<{
        locationId: string;
        label: string;
        neighborhood: string | null;
        retailerName: string;
        pickupCount: string;
      }>();

    return rows.map(
      (row) =>
        new PartnerLocationResponseDto({
          locationId: row.locationId,
          label: row.label,
          retailerName: row.retailerName,
          neighborhood: row.neighborhood,
          pickupCount: Number(row.pickupCount),
        }),
    );
  }

  /**
   * Builds a period-scoped impact report for the caller's organization.
   * @param caller The authenticated caller.
   * @param period The period as `YYYY` or `YYYY-MM`.
   * @returns A Promise that resolves with the report.
   */
  async findImpact(
    caller: AuthenticatedUser,
    period?: string,
  ): Promise<ImpactReportResponseDto> {
    const recipient = await this.resolveRecipient(caller);
    const resolved = resolvePeriod(period);

    const totals = await this.impactService.totals({
      recipientId: recipient.id,
      from: resolved.from,
      to: resolved.to,
    });

    const factor = await this.impactFactorsService.findEffectiveOn(
      resolved.from.toISOString().slice(0, 10),
    );

    return new ImpactReportResponseDto({
      ...totals,
      period: resolved.period,
      periodLabel: resolved.periodLabel,
      impactFactor: new ImpactFactorSummaryDto({
        mealsPerKg: factor?.mealsPerKg ?? 0,
        co2KgPerKg: factor?.co2KgPerKg ?? 0,
      }),
    });
  }

  /**
   * Builds the organization's permanent verification pass.
   * @param caller The authenticated caller.
   * @returns A Promise that resolves with the pass.
   */
  async findVerificationPass(
    caller: AuthenticatedUser,
  ): Promise<VerificationPassResponseDto> {
    const recipient = await this.resolveRecipient(caller);

    return new VerificationPassResponseDto({
      recipientId: recipient.id,
      displayName: recipient.displayName,
      registrationCode: recipient.registrationCode,
      passCode: `SPIRA-ORG:${recipient.registrationCode ?? recipient.id}`,
      isVerified: recipient.verifiedAt !== null,
      initials: new RecipientResponseDto(recipient).initials,
    });
  }

  /**
   * Loads one of the caller's own contacts, or refuses.
   * @param caller The authenticated caller.
   * @param id The contact to load.
   * @returns A Promise that resolves with the contact.
   * @throws NotFoundException If the contact belongs to another organization.
   */
  private async findOwnContact(
    caller: AuthenticatedUser,
    id: string,
  ): Promise<Contact> {
    const recipient = await this.resolveRecipient(caller);

    const contact = await this.contactRepository.findOne({
      where: { id, recipientId: recipient.id },
    });

    if (!contact) {
      throw new NotFoundException('That contact was not found.');
    }

    return contact;
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
}
