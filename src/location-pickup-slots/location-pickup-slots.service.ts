import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import {
  CreateLocationPickupSlotDto,
  LocationPickupSlotCreatedResponseDto,
  LocationPickupSlotResponseDto,
  UpdateLocationPickupSlotDto,
} from './dto/index.js';
import { LocationPickupSlot } from './entities/location-pickup-slot.entity.js';

/**
 * Business logic for the named collection windows a branch offers. Implements
 * {@link CrudRepository} so the "find a valid record or throw" contract is the
 * same across modules.
 */
@Injectable()
export class LocationPickupSlotsService implements CrudRepository<LocationPickupSlot> {
  constructor(
    @InjectRepository(LocationPickupSlot)
    private readonly slotRepository: Repository<LocationPickupSlot>,
  ) {}

  /**
   * Finds a slot by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the slot to look up.
   * @returns A Promise that resolves with the slot found.
   * @throws NotFoundException If the slot does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<LocationPickupSlot> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid LocationPickupSlot ID: ${id}`);
    }

    const slot = await this.slotRepository.findOne({ where: { id: uuid } });

    if (!slot) {
      throw new NotFoundException(
        `LocationPickupSlot with ID: ${id} not found or not valid`,
      );
    }

    return slot;
  }

  /**
   * Retrieves every slot that is not soft-deleted.
   * @returns A Promise that resolves with all slots mapped to LocationPickupSlotResponseDto.
   */
  async findAll(): Promise<LocationPickupSlotResponseDto[]> {
    const slots = await this.slotRepository.find({
      order: { locationId: 'ASC', startTime: 'ASC' },
    });

    return slots.map((slot) => new LocationPickupSlotResponseDto(slot));
  }

  /**
   * Retrieves a single slot by its ID.
   * @param id The ID of the slot to look up.
   * @returns A Promise that resolves with the slot mapped to LocationPickupSlotResponseDto.
   * @throws NotFoundException If the slot is not found.
   */
  async findOne(id: string): Promise<LocationPickupSlotResponseDto> {
    return new LocationPickupSlotResponseDto(await this.findValid(id));
  }

  /**
   * Retrieves the slots a branch currently offers, earliest first.
   *
   * This is what the recipient app reserves against, so inactive slots are left
   * out: offering a window that cannot be booked is worse than offering none.
   * @param locationId The ID of the branch.
   * @returns A Promise that resolves with the active slots.
   */
  async findAllByLocation(
    locationId: string,
  ): Promise<LocationPickupSlotResponseDto[]> {
    const slots = await this.slotRepository.find({
      where: { locationId, isActive: true },
      order: { weekday: 'ASC', startTime: 'ASC' },
    });

    return slots.map((slot) => new LocationPickupSlotResponseDto(slot));
  }

  /**
   * Offers a new collection window at a branch.
   * @param createLocationPickupSlotDto The data to create the slot with.
   * @returns A Promise that resolves with the created slot and a success message.
   * @throws BadRequestException If the window does not end after it starts, or
   * an identical window is already offered.
   */
  async create(
    createLocationPickupSlotDto: CreateLocationPickupSlotDto,
  ): Promise<LocationPickupSlotCreatedResponseDto> {
    const { locationId, startTime, endTime, weekday, label } =
      createLocationPickupSlotDto;

    this.assertWindowOrder(startTime, endTime);

    const duplicate = await this.slotRepository.findOne({
      where: {
        locationId,
        startTime,
        endTime,
        weekday: weekday === undefined ? IsNull() : weekday,
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        `This branch already offers a window from ${startTime} to ${endTime}: ${duplicate.label}`,
      );
    }

    const slot = await this.slotRepository.save(
      this.slotRepository.create({
        ...createLocationPickupSlotDto,
        weekday: weekday ?? null,
      }),
    );

    return new LocationPickupSlotCreatedResponseDto(
      slot,
      `Pickup slot "${label}" created successfully.`,
    );
  }

  /**
   * Edits a slot found by its ID.
   * @param id The ID of the slot to update.
   * @param updateLocationPickupSlotDto The new values.
   * @returns A Promise that resolves with the updated slot and a success message.
   * @throws NotFoundException If the slot is not found.
   * @throws BadRequestException If the resulting window does not end after it starts.
   */
  async update(
    id: string,
    updateLocationPickupSlotDto: UpdateLocationPickupSlotDto,
  ): Promise<LocationPickupSlotCreatedResponseDto> {
    const slot = await this.findValid(id);

    Object.assign(slot, updateLocationPickupSlotDto);

    this.assertWindowOrder(slot.startTime, slot.endTime);

    const updatedSlot = await this.slotRepository.save(slot);

    return new LocationPickupSlotCreatedResponseDto(
      updatedSlot,
      'Pickup slot updated successfully.',
    );
  }

  /**
   * Soft-deletes a slot. Donations that reserved against it keep their
   * reference, because the foreign key is `SET NULL` only on a hard delete.
   * @param id The ID of the slot to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the slot is not found.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const slot = await this.findValid(id);

    await this.slotRepository.softDelete(slot.id);

    return new MessageResponseDto('Pickup slot deleted successfully.');
  }

  /**
   * Rejects a window that does not end after it starts.
   *
   * The database enforces this too, but a 400 naming the two times is more use
   * to a caller than a constraint violation.
   * @param startTime The opening time.
   * @param endTime The closing time.
   * @throws BadRequestException If the window is empty or inverted.
   */
  private assertWindowOrder(startTime: string, endTime: string): void {
    if (endTime <= startTime) {
      throw new BadRequestException(
        `The pickup window must end after it starts, but ${startTime} is not before ${endTime}.`,
      );
    }
  }
}
