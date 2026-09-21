import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import {
  CreateInventoryItemDto,
  InventoryItemCreatedResponseDto,
  InventoryItemResponseDto,
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
    });

    if (!item) {
      throw new NotFoundException(
        `InventoryItem with ID: ${id} not found or not valid`,
      );
    }

    return item;
  }

  /**
   * Retrieves every stock lot that is not soft-deleted.
   * @returns A Promise that resolves with all lots mapped to InventoryItemResponseDto.
   */
  async findAll(): Promise<InventoryItemResponseDto[]> {
    const items = await this.inventoryItemRepository.find({
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
    const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const items = await this.inventoryItemRepository.find({
      where: {
        locationId,
        status: InventoryItemStatus.IN_INVENTORY,
        expiryDate: LessThanOrEqual(cutoff),
      },
      order: { expiryDate: 'ASC' },
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
    const item = this.inventoryItemRepository.create({
      ...createInventoryItemDto,
      status: InventoryItemStatus.IN_INVENTORY,
      listedAt: new Date(),
    });

    const newItem = await this.inventoryItemRepository.save(item);

    return new InventoryItemCreatedResponseDto(
      newItem,
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

    Object.assign(item, updateInventoryItemDto);

    const updatedItem = await this.inventoryItemRepository.save(item);

    return new InventoryItemCreatedResponseDto(
      updatedItem,
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
