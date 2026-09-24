import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';

import {
  DEFAULT_PAGE_SIZE,
  PageMetaDto,
  PaginatedResponseDto,
} from '../common/dto/index.js';
import type { AuthenticatedUser } from '../common/interfaces/index.js';
import { isPastUseBy } from '../common/expiry/expiry.view.js';
import { pickupWindowLabel } from '../common/pickup/pickup-window.view.js';
import { DonationLineResponseDto } from '../donations/dto/donation-line-response.dto.js';
import { PickupTokenResponseDto } from '../donations/dto/pickup-token-response.dto.js';
import { DonationLine } from '../donations/entities/donation-line.entity.js';
import { Donation } from '../donations/entities/donation.entity.js';
import { PickupToken } from '../donations/entities/pickup-token.entity.js';
import { DonationOrigin } from '../donations/enums/donation-origin.enum.js';
import { DonationStatus } from '../donations/enums/donation-status.enum.js';
import { ImpactFactorsService } from '../impact-factors/impact-factors.service.js';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity.js';
import { InventoryItemStatus } from '../inventory-items/enums/inventory-item-status.enum.js';
import { LocationPickupSlot } from '../location-pickup-slots/entities/location-pickup-slot.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { Recipient } from '../recipients/entities/recipient.entity.js';
import {
  CreateReservationDto,
  QueryReservationsDto,
  ReservationCountsDto,
  ReservationResponseDto,
  ReservationWindow,
} from './dto/index.js';

/** Statuses a reservation still to be collected can be in. */
const ACTIVE_STATUSES = [
  DonationStatus.ACCEPTED,
  DonationStatus.READY_FOR_PICKUP,
  DonationStatus.DRIVER_EN_ROUTE,
];

/**
 * The recipient side of a donation: claiming off the shelf and reading back the
 * resulting passes.
 *
 * A claim writes a donation that is already `ACCEPTED` with origin
 * `RECIPIENT_CLAIM`, because the recipient has just agreed to it — routing it
 * through `OFFERED` would ask the retailer to offer something already taken.
 */
@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(PickupToken)
    private readonly tokenRepository: Repository<PickupToken>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(LocationPickupSlot)
    private readonly slotRepository: Repository<LocationPickupSlot>,
    private readonly dataSource: DataSource,
    private readonly impactFactorsService: ImpactFactorsService,
  ) {}

  /**
   * Claims lots off the shelf, atomically.
   *
   * The lots are locked with `SELECT … FOR UPDATE` before anything is written,
   * so two recipients racing for the last tray cannot both win. The client's own
   * availability check is optimistic, which is exactly why the server cannot be.
   * @param recipient The claiming recipient.
   * @param caller The authenticated user making the claim.
   * @param createReservationDto What is being claimed, and when it will be collected.
   * @returns A Promise that resolves with the reservation, pass included.
   * @throws NotFoundException If the store does not exist.
   * @throws BadRequestException If the window is missing, inverted or unknown.
   * @throws ConflictException If any lot was taken first.
   */
  async claim(
    recipient: Recipient,
    caller: AuthenticatedUser,
    createReservationDto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    const store = await this.locationRepository.findOne({
      where: { id: createReservationDto.locationId },
    });

    if (!store?.retailerId) {
      throw new NotFoundException('That store was not found.');
    }

    const window = await this.resolveWindow(store, createReservationDto);

    const donationId = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const locked = await manager
          .createQueryBuilder(InventoryItem, 'item')
          .setLock('pessimistic_write')
          .where('item.id IN (:...ids)', {
            ids: createReservationDto.inventoryItemIds,
          })
          .andWhere('item.deleted_at IS NULL')
          .getMany();

        const unavailableItemIds = this.findUnavailable(
          createReservationDto.inventoryItemIds,
          locked,
          store.id,
        );

        if (unavailableItemIds.length > 0) {
          throw new ConflictException({
            message:
              'Some of those lots are no longer available. Refresh and try again.',
            unavailableItemIds,
          });
        }

        const withProducts = await manager.find(InventoryItem, {
          where: { id: In(locked.map((item) => item.id)) },
          relations: { product: true },
        });

        const factor = await this.impactFactorsService.findEffectiveOn();

        const totals = withProducts.reduce(
          (sum, item) => ({
            quantity: sum.quantity + item.quantity,
            weightKg: sum.weightKg + item.weightKg,
            retailValue: sum.retailValue + (item.retailValue ?? 0),
          }),
          { quantity: 0, weightKg: 0, retailValue: 0 },
        );

        const donation = await manager.save(
          manager.create(Donation, {
            code: await this.nextDonationCode(manager),
            retailerId: store.retailerId as string,
            locationId: store.id,
            recipientId: recipient.id,
            status: DonationStatus.ACCEPTED,
            origin: DonationOrigin.RECIPIENT_CLAIM,
            createdByUserId: caller.id,
            acceptedByUserId: caller.id,
            acceptedAt: new Date(),
            pickupWindowStart: window.start,
            pickupWindowEnd: window.end,
            pickupSlotId: window.slotId,
            driverContactId: createReservationDto.driverContactId ?? null,
            recipientVehicleId: createReservationDto.recipientVehicleId ?? null,
            lineCount: withProducts.length,
            totalQuantity: Number(totals.quantity.toFixed(3)),
            totalWeightKg: Number(totals.weightKg.toFixed(3)),
            totalRetailValue: Number(totals.retailValue.toFixed(2)),
            currency: withProducts[0]?.currency ?? 'EUR',
            // Pinned at claim time so the figure the app shows now is the figure
            // the certificate will state later.
            estimatedMeals: factor
              ? Number((totals.weightKg * factor.mealsPerKg).toFixed(2))
              : null,
            co2AvoidedKg: factor
              ? Number((totals.weightKg * factor.co2KgPerKg).toFixed(3))
              : null,
            impactFactorId: factor?.id ?? null,
          }),
        );

        await manager.save(
          withProducts.map((item) =>
            manager.create(DonationLine, {
              donationId: donation.id,
              inventoryItemId: item.id,
              productName: item.product?.name ?? 'Unknown product',
              brand: item.product?.brand ?? null,
              barcode: item.product?.barcode ?? null,
              category: item.product?.category,
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

        await manager.update(
          InventoryItem,
          { id: In(withProducts.map((item) => item.id)) },
          {
            status: InventoryItemStatus.RESERVED,
            donationId: donation.id,
            isListed: false,
            queuedAt: new Date(),
          },
        );

        return donation.id;
      },
    );

    return await this.findOne(recipient, donationId);
  }

  /**
   * Lists a recipient's reservations, bucketed in their own timezone.
   * @param recipient The recipient whose reservations to list.
   * @param query The filters and page.
   * @returns A Promise that resolves with one page of reservations.
   */
  async findAll(
    recipient: Recipient,
    query: QueryReservationsDto,
  ): Promise<PaginatedResponseDto<ReservationResponseDto>> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const offset = this.decodeCursor(query.cursor);

    const builder = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.location', 'location')
      .leftJoinAndSelect('location.retailer', 'retailer')
      .where('donation.deleted_at IS NULL')
      .andWhere('donation.recipient_id = :recipientId', {
        recipientId: recipient.id,
      });

    if (query.status) {
      builder.andWhere('donation.status = :status', { status: query.status });
    }

    if (query.window) {
      this.applyWindowFilter(builder, recipient, query.window);
    }

    const total = await builder.getCount();

    const donations = await builder
      .orderBy('donation.pickup_window_start', 'ASC', 'NULLS LAST')
      .addOrderBy('donation.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const tokens = await this.findOutstandingTokens(
      donations.map((donation) => donation.id),
    );

    const nextOffset = offset + donations.length;

    return new PaginatedResponseDto(
      donations.map((donation) =>
        this.toResponse(donation, recipient, tokens.get(donation.id) ?? null),
      ),
      new PageMetaDto({
        total,
        count: donations.length,
        nextCursor: nextOffset < total ? this.encodeCursor(nextOffset) : null,
      }),
    );
  }

  /**
   * Reads one reservation, with its lines and outstanding pass.
   * @param recipient The recipient it must belong to.
   * @param id The donation ID.
   * @returns A Promise that resolves with the reservation.
   * @throws NotFoundException If it does not exist or belongs to someone else.
   */
  async findOne(
    recipient: Recipient,
    id: string,
  ): Promise<ReservationResponseDto> {
    const donation = await this.donationRepository.findOne({
      where: { id, recipientId: recipient.id },
      relations: {
        lines: true,
        location: { retailer: true, contacts: true },
      },
    });

    if (!donation) {
      throw new NotFoundException('That reservation was not found.');
    }

    const token = await this.tokenRepository.findOne({
      where: { donationId: donation.id, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    return this.toResponse(donation, recipient, token);
  }

  /**
   * Counts a recipient's active reservations, split into today and later.
   *
   * "Active" is defined here once and reused: the app's nav counted
   * `Reserved + Ready for pickup` while its header counted anything not
   * cancelled, so a delivered pass stayed "active" forever in one place.
   * @param recipient The recipient to count for.
   * @returns A Promise that resolves with the three counts.
   */
  async counts(recipient: Recipient): Promise<ReservationCountsDto> {
    const active = await this.donationRepository.find({
      where: { recipientId: recipient.id, status: In(ACTIVE_STATUSES) },
      select: { id: true, pickupWindowStart: true },
    });

    const bounds = this.dayBounds(recipient.timezone);

    let today = 0;

    for (const donation of active) {
      if (
        donation.pickupWindowStart &&
        donation.pickupWindowStart >= bounds.start &&
        donation.pickupWindowStart < bounds.end
      ) {
        today += 1;
      }
    }

    return new ReservationCountsDto({
      active: active.length,
      today,
      upcoming: active.length - today,
    });
  }

  /**
   * Works out which lots cannot be claimed, and why the whole claim must fail.
   * @param requestedIds Everything the caller asked for.
   * @param locked What was actually found and locked.
   * @param locationId The store being collected from.
   * @returns The IDs that are missing, already taken, unlisted or elsewhere.
   */
  private findUnavailable(
    requestedIds: string[],
    locked: InventoryItem[],
    locationId: string,
  ): string[] {
    const byId = new Map(locked.map((item) => [item.id, item]));

    return requestedIds.filter((id) => {
      const item = byId.get(id);

      return (
        !item ||
        !item.isListed ||
        item.locationId !== locationId ||
        item.status !== InventoryItemStatus.IN_INVENTORY ||
        // Checked here too, not only on the shelf: the shelf is a read taken some
        // time ago, and a use-by date can pass between browsing and claiming.
        isPastUseBy(item)
      );
    });
  }

  /**
   * Resolves the collection window from either a named slot or explicit bounds.
   * @param store The store being collected from.
   * @param dto The claim request.
   * @returns The window, and the slot it came from when it came from one.
   * @throws BadRequestException If neither form is usable.
   */
  private async resolveWindow(
    store: Location,
    dto: CreateReservationDto,
  ): Promise<{ start: Date; end: Date; slotId: string | null }> {
    if (dto.pickupSlotId) {
      const slot = await this.slotRepository.findOne({
        where: { id: dto.pickupSlotId, locationId: store.id, isActive: true },
      });

      if (!slot) {
        throw new BadRequestException(
          'That pickup slot is not offered by this store.',
        );
      }

      const today = new Date();
      const day = today.toISOString().slice(0, 10);

      return {
        start: new Date(`${day}T${slot.startTime}Z`),
        end: new Date(`${day}T${slot.endTime}Z`),
        slotId: slot.id,
      };
    }

    if (!dto.pickupWindowStart || !dto.pickupWindowEnd) {
      throw new BadRequestException(
        'Give either a pickup slot, or both a window start and end.',
      );
    }

    const start = new Date(dto.pickupWindowStart);
    const end = new Date(dto.pickupWindowEnd);

    if (end <= start) {
      throw new BadRequestException(
        'The pickup window must end after it starts.',
      );
    }

    return { start, end, slotId: null };
  }

  /**
   * Narrows a query to today, later, or already past, in the recipient's day.
   * @param builder The query to narrow.
   * @param recipient The recipient whose timezone defines the day.
   * @param window The bucket to keep.
   */
  private applyWindowFilter(
    builder: ReturnType<Repository<Donation>['createQueryBuilder']>,
    recipient: Recipient,
    window: ReservationWindow,
  ): void {
    const bounds = this.dayBounds(recipient.timezone);

    if (window === ReservationWindow.TODAY) {
      builder
        .andWhere('donation.pickup_window_start >= :dayStart', {
          dayStart: bounds.start,
        })
        .andWhere('donation.pickup_window_start < :dayEnd', {
          dayEnd: bounds.end,
        });

      return;
    }

    if (window === ReservationWindow.UPCOMING) {
      builder.andWhere('donation.pickup_window_start >= :dayEnd', {
        dayEnd: bounds.end,
      });

      return;
    }

    builder.andWhere('donation.pickup_window_start < :dayStart', {
      dayStart: bounds.start,
    });
  }

  /**
   * Finds the start and end of "today" in a given timezone, as instants.
   * @param timezone The IANA timezone to resolve the day in.
   * @returns The half-open bounds of the local day.
   */
  private dayBounds(timezone: string): { start: Date; end: Date } {
    const now = new Date();

    const localDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    // The offset is read at "now" rather than assumed, so the bounds stay
    // correct across a daylight-saving change.
    const offsetMinutes = this.offsetMinutes(now, timezone);
    const start = new Date(
      new Date(`${localDay}T00:00:00Z`).getTime() - offsetMinutes * 60 * 1000,
    );

    return {
      start,
      end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Measures a timezone's offset from UTC at a given instant, in minutes.
   * @param at The instant to measure at.
   * @param timezone The IANA timezone.
   * @returns Minutes ahead of UTC, negative when behind.
   */
  private offsetMinutes(at: Date, timezone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);

    const lookup = (type: string): string =>
      parts.find((part) => part.type === type)?.value ?? '0';

    const asUtc = Date.UTC(
      Number(lookup('year')),
      Number(lookup('month')) - 1,
      Number(lookup('day')),
      Number(lookup('hour')) % 24,
      Number(lookup('minute')),
      Number(lookup('second')),
    );

    return Math.round((asUtc - at.getTime()) / (60 * 1000));
  }

  /**
   * Loads the outstanding pass for each of several donations.
   * @param donationIds The donations to look up.
   * @returns A Promise that resolves with a donation-to-token map.
   */
  private async findOutstandingTokens(
    donationIds: string[],
  ): Promise<Map<string, PickupToken>> {
    if (donationIds.length === 0) {
      return new Map();
    }

    const tokens = await this.tokenRepository.find({
      where: { donationId: In(donationIds), consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    const byDonation = new Map<string, PickupToken>();

    for (const token of tokens) {
      if (!byDonation.has(token.donationId)) {
        byDonation.set(token.donationId, token);
      }
    }

    return byDonation;
  }

  /**
   * Shapes a donation as the recipient app's reservation.
   * @param donation The donation, with its location loaded.
   * @param recipient The recipient, whose timezone labels the window.
   * @param token The outstanding pass, when there is one.
   * @returns The reservation representation.
   */
  private toResponse(
    donation: Donation,
    recipient: Recipient,
    token: PickupToken | null,
  ): ReservationResponseDto {
    const store = donation.location;
    const bounds = this.dayBounds(recipient.timezone);
    const start = donation.pickupWindowStart;

    const window =
      start === null
        ? ReservationWindow.UPCOMING
        : start < bounds.start
          ? ReservationWindow.PAST
          : start < bounds.end
            ? ReservationWindow.TODAY
            : ReservationWindow.UPCOMING;

    const storeContact =
      store?.contacts?.find((contact) => contact.isPrimary) ??
      store?.contacts?.[0] ??
      null;

    return new ReservationResponseDto({
      id: donation.id,
      code: donation.code,
      status: donation.status,
      locationId: donation.locationId,
      locationLabel: store?.label ?? 'Unknown store',
      locationAddress: [store?.addressLine1, store?.addressLine2, store?.city]
        .filter(Boolean)
        .join(', '),
      neighborhood: store?.neighborhood ?? null,
      accessInstructions: store?.accessInstructions ?? null,
      retailerName:
        store?.retailer?.tradeName ??
        store?.retailer?.legalName ??
        'Unknown retailer',
      logoUrl: store?.retailer?.logoUrl ?? null,
      storeContactName: storeContact?.fullName ?? null,
      storePhone: store?.phone ?? null,
      pickupWindowStart: start ? start.toISOString() : null,
      pickupWindowEnd: donation.pickupWindowEnd
        ? donation.pickupWindowEnd.toISOString()
        : null,
      pickupWindowLabel: pickupWindowLabel(
        donation.pickupWindowStart,
        donation.pickupWindowEnd,
        recipient.timezone,
      ),
      window,
      lineCount: donation.lineCount,
      totalQuantity: donation.totalQuantity,
      totalWeightKg: donation.totalWeightKg,
      totalRetailValue: donation.totalRetailValue,
      currency: donation.currency,
      estimatedMeals: donation.estimatedMeals,
      co2AvoidedKg: donation.co2AvoidedKg,
      lines: donation.lines?.map((line) => new DonationLineResponseDto(line)),
      pickupToken: token ? new PickupTokenResponseDto(token) : null,
      createdAt: donation.createdAt.toISOString(),
    });
  }

  /**
   * Renders the collection window as the one label the app prints.
   * @param donation The donation carrying the window.
   * @param recipient The recipient whose timezone the label is in.
   * @param window Which bucket it falls in.
   * @returns The label, or null without a window.
   */

  /**
   * Allocates the next human-readable donation reference.
   * @param manager The transaction the claim is running in.
   * @returns A Promise that resolves with the reference.
   */
  private async nextDonationCode(manager: EntityManager): Promise<string> {
    const year = new Date().getUTCFullYear();

    const row = await manager
      .createQueryBuilder(Donation, 'donation')
      .select('COUNT(*)', 'count')
      .withDeleted()
      .where('donation.code LIKE :prefix', { prefix: `FR-${year}-%` })
      .getRawOne<{ count: string }>();

    return `FR-${year}-${String(Number(row?.count ?? 0) + 1).padStart(6, '0')}`;
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
