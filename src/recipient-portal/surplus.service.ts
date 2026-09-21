import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../common/dto/pagination-query.dto.js';
import { ProductCategory } from '../common/enums/product-category.enum.js';
import { SurplusUrgency } from '../common/enums/surplus-urgency.enum.js';
import { expiryView } from '../common/expiry/expiry.view.js';
import { boundingBoxDeltas, haversineKm } from '../common/geo/index.js';
import { ImpactFactorsService } from '../impact-factors/impact-factors.service.js';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity.js';
import { InventoryItemStatus } from '../inventory-items/enums/inventory-item-status.enum.js';
import { LocationPickupSlot } from '../location-pickup-slots/entities/location-pickup-slot.entity.js';
import { Recipient } from '../recipients/entities/recipient.entity.js';
import { UrgencyThreshold } from '../recipients/enums/urgency-threshold.enum.js';
import {
  QuerySurplusPackagesDto,
  SurplusPackageResponseDto,
  SurplusPackageSort,
  SurplusPackagesMetaDto,
  SurplusPackagesResponseDto,
} from './dto/index.js';

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_CURRENCY = 'EUR';

/** How urgently a threshold setting says a recipient wants to be told. */
const THRESHOLD_BANDS: Record<UrgencyThreshold, SurplusUrgency[]> = {
  [UrgencyThreshold.ALL]: [
    SurplusUrgency.CRITICAL,
    SurplusUrgency.EXPIRING,
    SurplusUrgency.STANDARD,
  ],
  [UrgencyThreshold.CRITICAL_EXPIRING]: [
    SurplusUrgency.CRITICAL,
    SurplusUrgency.EXPIRING,
  ],
  [UrgencyThreshold.CRITICAL_ONLY]: [SurplusUrgency.CRITICAL],
};

/** Rank used to compare urgency bands, most pressing first. */
const URGENCY_RANK: Record<SurplusUrgency, number> = {
  [SurplusUrgency.CRITICAL]: 0,
  [SurplusUrgency.EXPIRING]: 1,
  [SurplusUrgency.STANDARD]: 2,
};

/** One lot as it comes back from the shelf query. */
interface ShelfRow {
  itemId: string;
  quantity: string;
  weightKg: string;
  retailValue: string | null;
  expiresAt: Date | null;
  category: ProductCategory;
  productName: string;
  brand: string | null;
  locationId: string;
  label: string;
  storeFormat: string | null;
  neighborhood: string | null;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  retailerId: string;
  retailerName: string;
  tradeName: string | null;
  logoUrl: string | null;
  verifiedAt: Date | null;
}

/**
 * Builds the open surplus shelf the recipient app browses and claims from.
 *
 * Returns stores, not lots: the map draws one marker per store carrying the
 * availability summary, so the aggregation belongs here rather than in the
 * client. The filters narrow which lots count towards each store's summary,
 * which is why `meta` reports the unfiltered total separately — the app's count
 * badge is meant to show what is out there, not what survived the filters.
 */
@Injectable()
export class SurplusService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
    @InjectRepository(LocationPickupSlot)
    private readonly slotRepository: Repository<LocationPickupSlot>,
    private readonly impactFactorsService: ImpactFactorsService,
  ) {}

  /**
   * Finds claimable stock near a recipient, grouped by store.
   * @param recipient The recipient browsing, whose saved preferences apply.
   * @param query The filters, ordering and page.
   * @param origin The point to measure distance from.
   * @returns A Promise that resolves with one page of stores and the counts.
   */
  async findPackages(
    recipient: Recipient,
    query: QuerySurplusPackagesDto,
    origin: { latitude: number | null; longitude: number | null },
  ): Promise<SurplusPackagesResponseDto> {
    const radiusKm =
      query.radiusKm ?? recipient.alertRadiusKm ?? DEFAULT_RADIUS_KM;
    const lat = query.lat ?? origin.latitude;
    const lng = query.lng ?? origin.longitude;

    const rows = await this.fetchShelf(query, lat, lng, radiusKm);
    const factor = await this.impactFactorsService.findEffectiveOn();

    const withDistance = rows
      .map((row) => ({
        row,
        distanceKm: this.distanceFor(row, lat, lng),
      }))
      .filter(
        ({ distanceKm }) => distanceKm === null || distanceKm <= radiusKm,
      );

    const totalPackages = withDistance.length;

    const matching = withDistance.filter(({ row }) =>
      this.matchesFilters(row, query),
    );

    const grouped = this.groupByStore(matching, factor);
    const ordered = this.applySort(grouped, query.sort);

    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = this.decodeCursor(query.cursor);
    const page = ordered.slice(offset, offset + limit);

    await this.attachTodaysPickupHours(page);

    const nextOffset = offset + page.length;

    return new SurplusPackagesResponseDto(
      page,
      new SurplusPackagesMetaDto({
        totalPackages,
        filteredPackages: matching.length,
        count: page.length,
        total: ordered.length,
        nextCursor:
          nextOffset < ordered.length ? this.encodeCursor(nextOffset) : null,
        radiusKm,
        originLatitude: lat,
        originLongitude: lng,
      }),
    );
  }

  /**
   * Finds the stock a recipient should be alerted about, applying their saved
   * preferences.
   *
   * Implemented as rules, not a model: the app's "AI" panel was an 800 ms fake
   * spinner over a client-side filter, and what it actually needs is the
   * recipient's own radius and urgency threshold applied honestly.
   * @param recipient The recipient being alerted.
   * @param origin The point to measure distance from.
   * @param radiusKm Override for the saved radius.
   * @param urgencyThreshold Override for the saved threshold.
   * @param maxHoursLeft Only alert on stock expiring within this many hours.
   * @returns A Promise that resolves with the stores worth acting on.
   */
  async findUrgentAlerts(
    recipient: Recipient,
    origin: { latitude: number | null; longitude: number | null },
    radiusKm?: number,
    urgencyThreshold?: UrgencyThreshold,
    maxHoursLeft?: number,
  ): Promise<SurplusPackagesResponseDto> {
    const threshold =
      urgencyThreshold ?? recipient.urgencyThreshold ?? UrgencyThreshold.ALL;
    const allowed = THRESHOLD_BANDS[threshold];

    const packages = await this.findPackages(
      recipient,
      {
        radiusKm: radiusKm ?? recipient.alertRadiusKm,
        sort: SurplusPackageSort.URGENCY,
        limit: MAX_PAGE_SIZE,
      },
      origin,
    );

    const data = packages.data.filter((store) => {
      if (!store.highestUrgency || !allowed.includes(store.highestUrgency)) {
        return false;
      }

      if (
        maxHoursLeft !== undefined &&
        (store.earliestExpiryHoursLeft === null ||
          store.earliestExpiryHoursLeft > maxHoursLeft)
      ) {
        return false;
      }

      return true;
    });

    return new SurplusPackagesResponseDto(data, {
      ...packages.meta,
      count: data.length,
      total: data.length,
      nextCursor: null,
    });
  }

  /**
   * Reads every claimable lot in range, with its store and catalogue details.
   * @param query The filters that can be pushed into SQL.
   * @param lat Origin latitude, when known.
   * @param lng Origin longitude, when known.
   * @param radiusKm The radius to bound the query by.
   * @returns A Promise that resolves with the raw rows.
   */
  private async fetchShelf(
    query: QuerySurplusPackagesDto,
    lat: number | null,
    lng: number | null,
    radiusKm: number,
  ): Promise<ShelfRow[]> {
    const builder = this.inventoryItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.product', 'product')
      .innerJoin('item.location', 'location')
      .innerJoin('location.retailer', 'retailer')
      .select([
        'item.id AS "itemId"',
        'item.quantity AS "quantity"',
        'item.weight_kg AS "weightKg"',
        'item.retail_value AS "retailValue"',
        'item.expires_at AS "expiresAt"',
        'product.category AS "category"',
        'product.name AS "productName"',
        'product.brand AS "brand"',
        'location.id AS "locationId"',
        'location.label AS "label"',
        'location.store_format AS "storeFormat"',
        'location.neighborhood AS "neighborhood"',
        'location.city AS "city"',
        'location.address_line1 AS "addressLine1"',
        'location.address_line2 AS "addressLine2"',
        'location.phone AS "phone"',
        'location.latitude AS "latitude"',
        'location.longitude AS "longitude"',
        'retailer.id AS "retailerId"',
        'retailer.legal_name AS "retailerName"',
        'retailer.trade_name AS "tradeName"',
        'retailer.logo_url AS "logoUrl"',
        'retailer.verified_at AS "verifiedAt"',
      ])
      .where('item.deleted_at IS NULL')
      .andWhere('item.is_listed = true')
      .andWhere('item.status = :status', {
        status: InventoryItemStatus.IN_INVENTORY,
      })
      .andWhere('location.deleted_at IS NULL')
      .andWhere('location.is_active = true')
      .andWhere('retailer.deleted_at IS NULL');

    if (query.locationId) {
      builder.andWhere('location.id = :locationId', {
        locationId: query.locationId,
      });
    }

    // A bounding box first, so the index can be used; the exact great-circle
    // distance is then applied in memory over a much smaller set.
    if (lat !== null && lng !== null) {
      const { latDelta, lngDelta } = boundingBoxDeltas(lat, radiusKm);

      builder.andWhere(
        '(location.latitude IS NULL OR (location.latitude BETWEEN :minLat AND :maxLat AND location.longitude BETWEEN :minLng AND :maxLng))',
        {
          minLat: lat - latDelta,
          maxLat: lat + latDelta,
          minLng: lng - lngDelta,
          maxLng: lng + lngDelta,
        },
      );
    }

    return await builder.getRawMany<ShelfRow>();
  }

  /**
   * Measures one store's distance from the search origin.
   * @param row The store row.
   * @param lat Origin latitude, when known.
   * @param lng Origin longitude, when known.
   * @returns The distance in kilometres, or null when either point is unknown.
   */
  private distanceFor(
    row: ShelfRow,
    lat: number | null,
    lng: number | null,
  ): number | null {
    if (lat === null || lng === null || !row.latitude || !row.longitude) {
      return null;
    }

    return haversineKm(lat, lng, Number(row.latitude), Number(row.longitude));
  }

  /**
   * Applies the filters that cannot be pushed into SQL.
   * @param row The lot to test.
   * @param query The filters in force.
   * @returns Whether the lot counts towards its store's summary.
   */
  private matchesFilters(
    row: ShelfRow,
    query: QuerySurplusPackagesDto,
  ): boolean {
    if (query.category && row.category !== query.category) {
      return false;
    }

    if (query.urgency) {
      const band = expiryView(row.expiresAt).urgency;

      if (!band || URGENCY_RANK[band] > URGENCY_RANK[query.urgency]) {
        return false;
      }
    }

    if (query.q) {
      const term = query.q.toLowerCase();
      const haystack = [
        row.productName,
        row.brand ?? '',
        row.label,
        row.tradeName ?? row.retailerName,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(term)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Collapses lots into one row per store, summing the availability figures.
   * @param rows The lots that matched, each with its distance.
   * @param factor The impact factor in force, for the meal estimate.
   * @returns One entry per store.
   */
  private groupByStore(
    rows: { row: ShelfRow; distanceKm: number | null }[],
    factor: { mealsPerKg: number } | null,
  ): SurplusPackageResponseDto[] {
    const stores = new Map<
      string,
      {
        dto: SurplusPackageResponseDto;
        soonestHours: number | null;
      }
    >();

    for (const { row, distanceKm } of rows) {
      let entry = stores.get(row.locationId);

      if (!entry) {
        entry = {
          soonestHours: null,
          dto: new SurplusPackageResponseDto({
            locationId: row.locationId,
            label: row.label,
            retailerId: row.retailerId,
            retailerName: row.tradeName ?? row.retailerName,
            logoUrl: row.logoUrl,
            storeFormat: row.storeFormat,
            neighborhood: row.neighborhood,
            city: row.city,
            address: [row.addressLine1, row.addressLine2]
              .filter(Boolean)
              .join(', '),
            phone: row.phone,
            latitude: row.latitude === null ? null : Number(row.latitude),
            longitude: row.longitude === null ? null : Number(row.longitude),
            distanceKm,
            isVerified: row.verifiedAt !== null,
            availableCount: 0,
            totalQuantity: 0,
            totalWeightKg: 0,
            totalValue: 0,
            currency: DEFAULT_CURRENCY,
            estimatedMeals: 0,
            categories: [],
            categorySummary: {},
            highestUrgency: null,
            earliestExpiryHoursLeft: null,
            pickupHoursToday: [],
          }),
        };

        stores.set(row.locationId, entry);
      }

      const { dto } = entry;

      dto.availableCount += 1;
      dto.totalQuantity += Number(row.quantity);
      dto.totalWeightKg += Number(row.weightKg);
      dto.totalValue += Number(row.retailValue ?? 0);
      dto.categorySummary[row.category] =
        (dto.categorySummary[row.category] ?? 0) + 1;

      const view = expiryView(row.expiresAt);

      if (
        view.urgency &&
        (dto.highestUrgency === null ||
          URGENCY_RANK[view.urgency] < URGENCY_RANK[dto.highestUrgency])
      ) {
        dto.highestUrgency = view.urgency;
      }

      if (
        view.hoursRemaining !== null &&
        (entry.soonestHours === null ||
          view.hoursRemaining < entry.soonestHours)
      ) {
        entry.soonestHours = view.hoursRemaining;
      }
    }

    return [...stores.values()].map(({ dto, soonestHours }) => {
      dto.totalQuantity = Number(dto.totalQuantity.toFixed(3));
      dto.totalWeightKg = Number(dto.totalWeightKg.toFixed(3));
      dto.totalValue = Number(dto.totalValue.toFixed(2));
      dto.estimatedMeals = factor
        ? Number((dto.totalWeightKg * factor.mealsPerKg).toFixed(2))
        : 0;
      dto.categories = Object.keys(dto.categorySummary) as ProductCategory[];
      dto.earliestExpiryHoursLeft = soonestHours;

      return dto;
    });
  }

  /**
   * Orders the shelf. Stores with no coordinates sort last under `distance`,
   * because "unknown" is not "nearby".
   * @param stores The grouped stores.
   * @param sort The requested ordering.
   * @returns The same array, ordered.
   */
  private applySort(
    stores: SurplusPackageResponseDto[],
    sort?: SurplusPackageSort,
  ): SurplusPackageResponseDto[] {
    switch (sort) {
      case SurplusPackageSort.URGENCY:
        return stores.sort(
          (a, b) =>
            (a.highestUrgency ? URGENCY_RANK[a.highestUrgency] : 99) -
              (b.highestUrgency ? URGENCY_RANK[b.highestUrgency] : 99) ||
            (a.earliestExpiryHoursLeft ?? Number.MAX_SAFE_INTEGER) -
              (b.earliestExpiryHoursLeft ?? Number.MAX_SAFE_INTEGER),
        );
      case SurplusPackageSort.WEIGHT:
        return stores.sort((a, b) => b.totalWeightKg - a.totalWeightKg);
      case SurplusPackageSort.VALUE:
        return stores.sort((a, b) => b.totalValue - a.totalValue);
      default:
        return stores.sort(
          (a, b) =>
            (a.distanceKm ?? Number.MAX_SAFE_INTEGER) -
            (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
        );
    }
  }

  /**
   * Attaches each store's collection windows for today.
   * @param stores The page of stores to annotate.
   */
  private async attachTodaysPickupHours(
    stores: SurplusPackageResponseDto[],
  ): Promise<void> {
    if (stores.length === 0) {
      return;
    }

    const isoWeekday = ((new Date().getUTCDay() + 6) % 7) + 1;

    const slots = await this.slotRepository
      .createQueryBuilder('slot')
      .where('slot.deleted_at IS NULL')
      .andWhere('slot.is_active = true')
      .andWhere('slot.location_id IN (:...locationIds)', {
        locationIds: stores.map((store) => store.locationId),
      })
      .andWhere('(slot.weekday IS NULL OR slot.weekday = :isoWeekday)', {
        isoWeekday,
      })
      .orderBy('slot.start_time', 'ASC')
      .getMany();

    const byLocation = new Map<string, string[]>();

    for (const slot of slots) {
      const labels = byLocation.get(slot.locationId) ?? [];

      labels.push(
        `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      );
      byLocation.set(slot.locationId, labels);
    }

    for (const store of stores) {
      store.pickupHoursToday = byLocation.get(store.locationId) ?? [];
    }
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
