import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  LessThanOrEqual,
  Repository,
  type SelectQueryBuilder,
} from 'typeorm';

import {
  DEFAULT_PAGE_SIZE,
  MessageResponseDto,
  PageMetaDto,
  PaginatedResponseDto,
} from '../common/dto/index.js';
import { DonationReason } from '../common/enums/donation-reason.enum.js';
import { ProductCategory } from '../common/enums/product-category.enum.js';
import {
  CRITICAL_HOURS_THRESHOLD,
  EXPIRING_HOURS_THRESHOLD,
  SurplusUrgency,
} from '../common/enums/surplus-urgency.enum.js';
import { expiryView } from '../common/expiry/expiry.view.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import {
  CreateInventoryItemDto,
  InventoryFacetsResponseDto,
  InventoryItemCreatedResponseDto,
  InventoryItemResponseDto,
  InventoryItemSort,
  QueryInventoryItemsDto,
  UpdateInventoryItemDto,
} from './dto/index.js';
import { InventoryItem } from './entities/inventory-item.entity.js';
import { InventoryItemStatus } from './enums/inventory-item-status.enum.js';

/**
 * Business logic for donatable stock lots. Implements {@link CrudRepository} so
 * the "find a valid record or throw" contract is the same across modules.
 *
 * A lot committed to a donation is read-only here: the donation owns it from
 * that point, and nothing in this service may edit or remove it.
 */
@Injectable()
export class InventoryItemsService implements CrudRepository<InventoryItem> {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepository: Repository<InventoryItem>,
  ) {}

  /**
   * Finds an InventoryItem by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the lot to look up.
   * @returns A Promise that resolves with the lot found.
   * @throws NotFoundException If it does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<InventoryItem> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid InventoryItem ID: ${id}`);
    }

    const item = await this.inventoryItemRepository.findOne({
      where: { id: uuid },
      relations: { product: true },
    });

    if (!item) {
      throw new NotFoundException(
        `InventoryItem with ID: ${id} not found or not valid`,
      );
    }

    return item;
  }

  /**
   * Searches, filters, orders and pages the inventory list.
   *
   * The free-text term matches anywhere in the product name, brand or barcode,
   * which is what the retailer app's search box does client-side today. Urgency
   * is a filter on the stored expiry rather than a stored column, so the bands
   * cannot drift from the dates they came from.
   * @param query The filters, ordering and page.
   * @returns A Promise that resolves with one page of lots and its metadata.
   */
  async search(
    query: QueryInventoryItemsDto,
  ): Promise<PaginatedResponseDto<InventoryItemResponseDto>> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const offset = this.decodeCursor(query.cursor);
    const builder = this.buildSearchQuery(query);
    const total = await builder.getCount();

    const items = await this.applySort(builder, query.sort)
      .skip(offset)
      .take(limit)
      .getMany();

    const nextOffset = offset + items.length;

    return new PaginatedResponseDto(
      items.map((item) => new InventoryItemResponseDto(item)),
      new PageMetaDto({
        total,
        count: items.length,
        nextCursor: nextOffset < total ? this.encodeCursor(nextOffset) : null,
      }),
    );
  }

  /**
   * Counts lots per category and per urgency for the filter chips.
   *
   * Takes only the branch and status on purpose: the chips report how much each
   * category holds regardless of the filter in force, so narrowing by category
   * here would zero every chip but the active one.
   * @param locationId The branch to count within, when given.
   * @param status The lifecycle state to count, defaulting to available stock.
   * @returns A Promise that resolves with the facet counts.
   */
  async facets(
    locationId?: string,
    status: InventoryItemStatus = InventoryItemStatus.IN_INVENTORY,
  ): Promise<InventoryFacetsResponseDto> {
    const builder = this.inventoryItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.product', 'product')
      .where('item.deleted_at IS NULL')
      .andWhere('item.status = :status', { status });

    if (locationId) {
      builder.andWhere('item.location_id = :locationId', { locationId });
    }

    const categoryRows = await builder
      .clone()
      .select('product.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('product.category')
      .getRawMany<{ category: ProductCategory; count: string }>();

    const byCategory = Object.fromEntries(
      Object.values(ProductCategory).map((category) => [category, 0]),
    ) as Record<ProductCategory, number>;

    let total = 0;

    for (const row of categoryRows) {
      byCategory[row.category] = Number(row.count);
      total += Number(row.count);
    }

    const expiries = await builder
      .clone()
      .select('item.expires_at', 'expiresAt')
      .getRawMany<{ expiresAt: Date | null }>();

    const byUrgency = Object.fromEntries(
      Object.values(SurplusUrgency).map((urgency) => [urgency, 0]),
    ) as Record<SurplusUrgency, number>;

    for (const row of expiries) {
      const band = expiryView(row.expiresAt).urgency;

      if (band) {
        byUrgency[band] += 1;
      }
    }

    return new InventoryFacetsResponseDto({ total, byCategory, byUrgency });
  }

  /**
   * Lists lots that are near expiry *or* flagged for a given reason.
   *
   * The two conditions are ORed, not ANDed: the retailer app's expiry panel
   * surfaces anything worth acting on, and a lot marked `DAMAGED_PACKAGING`
   * needs moving whether or not its date is close.
   * @param locationId The branch to look at, when given.
   * @param withinDays How many days ahead counts as near expiry. Defaults to 2.
   * @param includeReason A reason to include regardless of the date.
   * @returns A Promise that resolves with the matching lots, soonest first.
   */
  async findExpiringOrFlagged(
    locationId?: string,
    withinDays = 2,
    includeReason?: DonationReason,
  ): Promise<InventoryItemResponseDto[]> {
    const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);

    const builder = this.inventoryItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .where('item.deleted_at IS NULL')
      .andWhere('item.status = :status', {
        status: InventoryItemStatus.IN_INVENTORY,
      });

    if (locationId) {
      builder.andWhere('item.location_id = :locationId', { locationId });
    }

    if (includeReason) {
      builder.andWhere(
        '(item.expires_at <= :cutoff OR item.reason = :includeReason)',
        { cutoff, includeReason },
      );
    } else {
      builder.andWhere('item.expires_at <= :cutoff', { cutoff });
    }

    const items = await builder
      .orderBy('item.expires_at', 'ASC', 'NULLS LAST')
      .getMany();

    return items.map((item) => new InventoryItemResponseDto(item));
  }

  /**
   * Builds the filtered query shared by the list and its total.
   * @param query The filters to apply.
   * @returns The query builder, unordered and unpaged.
   */
  private buildSearchQuery(
    query: QueryInventoryItemsDto,
  ): SelectQueryBuilder<InventoryItem> {
    const builder = this.inventoryItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .where('item.deleted_at IS NULL');

    if (query.locationId) {
      builder.andWhere('item.location_id = :locationId', {
        locationId: query.locationId,
      });
    }

    if (query.status) {
      builder.andWhere('item.status = :status', { status: query.status });
    }

    if (query.category) {
      builder.andWhere('product.category = :category', {
        category: query.category,
      });
    }

    if (query.reason) {
      builder.andWhere('item.reason = :reason', { reason: query.reason });
    }

    if (query.isListed !== undefined) {
      builder.andWhere('item.is_listed = :isListed', {
        isListed: query.isListed,
      });
    }

    if (query.q) {
      builder.andWhere(
        '(product.name ILIKE :term OR product.brand ILIKE :term OR product.barcode ILIKE :term)',
        { term: `%${query.q}%` },
      );
    }

    const hours =
      query.expiringWithinHours ??
      (query.expiringWithinDays ? query.expiringWithinDays * 24 : undefined);

    if (hours !== undefined) {
      builder.andWhere('item.expires_at <= :cutoff', {
        cutoff: new Date(Date.now() + hours * 60 * 60 * 1000),
      });
    }

    if (query.urgency) {
      this.applyUrgencyFilter(builder, query.urgency);
    }

    return builder;
  }

  /**
   * Narrows a query to one urgency band by bounding the expiry instead.
   *
   * Urgency is never stored, so a band is expressed as the window of expiry
   * times that produces it. `STANDARD` deliberately leaves out lots with no
   * expiry: a non-perishable does not have standard urgency, it has none.
   * @param builder The query to narrow.
   * @param urgency The band to keep.
   */
  private applyUrgencyFilter(
    builder: SelectQueryBuilder<InventoryItem>,
    urgency: SurplusUrgency,
  ): void {
    const critical = new Date(
      Date.now() + CRITICAL_HOURS_THRESHOLD * 60 * 60 * 1000,
    );
    const expiring = new Date(
      Date.now() + EXPIRING_HOURS_THRESHOLD * 60 * 60 * 1000,
    );

    if (urgency === SurplusUrgency.CRITICAL) {
      builder.andWhere('item.expires_at < :critical', { critical });

      return;
    }

    if (urgency === SurplusUrgency.EXPIRING) {
      builder
        .andWhere('item.expires_at >= :critical', { critical })
        .andWhere('item.expires_at < :expiring', { expiring });

      return;
    }

    builder.andWhere('item.expires_at >= :expiring', { expiring });
  }

  /**
   * Applies the requested ordering, defaulting to newest first.
   * @param builder The query to order.
   * @param sort The requested ordering.
   * @returns The same builder, ordered.
   */
  private applySort(
    builder: SelectQueryBuilder<InventoryItem>,
    sort?: InventoryItemSort,
  ): SelectQueryBuilder<InventoryItem> {
    switch (sort) {
      case InventoryItemSort.EXPIRES_AT_ASC:
        return builder.orderBy('item.expires_at', 'ASC', 'NULLS LAST');
      case InventoryItemSort.EXPIRES_AT_DESC:
        return builder.orderBy('item.expires_at', 'DESC', 'NULLS LAST');
      case InventoryItemSort.WEIGHT_DESC:
        return builder.orderBy('item.weight_kg', 'DESC');
      case InventoryItemSort.VALUE_DESC:
        return builder.orderBy('item.retail_value', 'DESC', 'NULLS LAST');
      default:
        return builder.orderBy('item.listed_at', 'DESC');
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

  /**
   * Retrieves every stock lot that is not soft-deleted.
   * @returns A Promise that resolves with all lots mapped to InventoryItemResponseDto.
   */
  async findAll(): Promise<InventoryItemResponseDto[]> {
    const items = await this.inventoryItemRepository.find({
      relations: { product: true },
      order: { listedAt: 'DESC' },
    });

    return items.map((item) => new InventoryItemResponseDto(item));
  }

  /**
   * Retrieves a single stock lot by its ID.
   * @param id The ID of the lot to look up.
   * @returns A Promise that resolves with the lot mapped to InventoryItemResponseDto.
   * @throws NotFoundException If the lot is not found.
   */
  async findOne(id: string): Promise<InventoryItemResponseDto> {
    const item = await this.findValid(id);

    return new InventoryItemResponseDto(item);
  }

  /**
   * Retrieves one branch's stock, optionally narrowed to a single status. This is
   * the query behind the inventory list.
   * @param locationId The ID of the branch.
   * @param status Only return lots in this state, when given.
   * @returns A Promise that resolves with the lots mapped to InventoryItemResponseDto.
   */
  async findAllByLocation(
    locationId: string,
    status?: InventoryItemStatus,
  ): Promise<InventoryItemResponseDto[]> {
    const items = await this.inventoryItemRepository.find({
      where: status ? { locationId, status } : { locationId },
      relations: { product: true },
      order: { listedAt: 'DESC' },
    });

    return items.map((item) => new InventoryItemResponseDto(item));
  }

  /**
   * Retrieves the lots at a branch that are close to their best-by date and
   * still available. This is the "near expiry" list.
   * @param locationId The ID of the branch.
   * @param withinDays How many days ahead to look. Defaults to 1.
   * @returns A Promise that resolves with the lots mapped to InventoryItemResponseDto.
   */
  async findExpiringAtLocation(
    locationId: string,
    withinDays = 1,
  ): Promise<InventoryItemResponseDto[]> {
    const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);

    const items = await this.inventoryItemRepository.find({
      where: {
        locationId,
        status: InventoryItemStatus.IN_INVENTORY,
        expiresAt: LessThanOrEqual(cutoff),
      },
      relations: { product: true },
      order: { expiresAt: 'ASC' },
    });

    return items.map((item) => new InventoryItemResponseDto(item));
  }

  /**
   * Loads several lots by ID, for the donation service to reserve.
   * @param ids The IDs to load.
   * @returns A Promise that resolves with the lots found, in no particular order.
   */
  async findManyByIds(ids: string[]): Promise<InventoryItem[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.inventoryItemRepository.find({
      where: { id: In(ids) },
    });
  }

  /**
   * Logs a lot of stock as donatable.
   * @param createInventoryItemDto The data to create the lot with.
   * @returns A Promise that resolves with the created lot and a success message.
   */
  async create(
    createInventoryItemDto: CreateInventoryItemDto,
  ): Promise<InventoryItemCreatedResponseDto> {
    const { expiresAt, ...rest } = createInventoryItemDto;

    const item = this.inventoryItemRepository.create({
      ...rest,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: InventoryItemStatus.IN_INVENTORY,
      listedAt: new Date(),
    });

    const newItem = await this.inventoryItemRepository.save(item);

    // Re-read so the response carries the catalogue details, the same as a GET.
    return new InventoryItemCreatedResponseDto(
      await this.findValid(newItem.id),
      'Inventory item created successfully.',
    );
  }

  /**
   * Updates a stock lot found by its ID.
   * @param id The ID of the lot to update.
   * @param updateInventoryItemDto The new data for the lot.
   * @returns A Promise that resolves with the updated lot and a success message.
   * @throws NotFoundException If the lot is not found.
   * @throws BadRequestException If the lot is already committed to a donation.
   */
  async update(
    id: string,
    updateInventoryItemDto: UpdateInventoryItemDto,
  ): Promise<InventoryItemCreatedResponseDto> {
    const item = await this.findValid(id);

    this.assertAvailable(item, 'edited');

    const { expiresAt, ...rest } = updateInventoryItemDto;

    Object.assign(item, rest);

    if (expiresAt !== undefined) {
      item.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const updatedItem = await this.inventoryItemRepository.save(item);

    return new InventoryItemCreatedResponseDto(
      await this.findValid(updatedItem.id),
      'Inventory item updated successfully.',
    );
  }

  /**
   * Soft-deletes a stock lot that was logged by mistake.
   * @param id The ID of the lot to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the lot is not found.
   * @throws BadRequestException If the lot is already committed to a donation.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const item = await this.findValid(id);

    this.assertAvailable(item, 'deleted');

    await this.inventoryItemRepository.softRemove(item);

    return new MessageResponseDto('Inventory item deleted successfully.');
  }

  /**
   * Rejects a change to a lot the donation flow already owns.
   * @param item The lot being changed.
   * @param action What was attempted, used in the message.
   * @throws BadRequestException If the lot is not `IN_INVENTORY`.
   */
  private assertAvailable(item: InventoryItem, action: string): void {
    if (item.status !== InventoryItemStatus.IN_INVENTORY) {
      throw new BadRequestException(
        `An inventory item with status ${item.status} cannot be ${action}. Remove it from its donation first.`,
      );
    }
  }
}
