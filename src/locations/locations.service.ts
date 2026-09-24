import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { assertSingleOwner, UUID_PATTERN } from '../common/validation/index.js';
import type { AuthenticatedUser } from '../common/interfaces/index.js';
import {
  assertCanCreateFor,
  assertOwn,
  ownScopeWhere,
} from '../common/scoping/org-scope.js';
import {
  CreateLocationDto,
  LocationCreatedResponseDto,
  LocationResponseDto,
  UpdateLocationDto,
} from './dto/index.js';
import { Location } from './entities/location.entity.js';

/**
 * Business logic for the Location entity. Implements {@link CrudRepository} so
 * the "find a valid record or throw" contract is the same across modules.
 */
@Injectable()
export class LocationsService implements CrudRepository<Location> {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  /**
   * Finds a Location by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the Location to look up.
   * @returns A Promise that resolves with the Location found.
   * @throws NotFoundException If the Location does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<Location> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid Location ID: ${id}`);
    }

    const location = await this.locationRepository.findOne({
      where: { id: uuid },
    });

    if (!location) {
      throw new NotFoundException(
        `Location with ID: ${id} not found or not valid`,
      );
    }

    return location;
  }

  /**
   * Retrieves every location that is not soft-deleted.
   * @returns A Promise that resolves with all locations mapped to LocationResponseDto.
   */
  async findAll(caller: AuthenticatedUser): Promise<LocationResponseDto[]> {
    const locations = await this.locationRepository.find({
      where: ownScopeWhere(caller, { retailer: "retailerId", recipient: "recipientId" }) ?? undefined,
      order: { createdAt: 'DESC' },
    });

    return locations.map((location) => new LocationResponseDto(location));
  }

  /**
   * Retrieves a single location by its ID.
   * @param id The ID of the location to look up.
   * @returns A Promise that resolves with the location mapped to LocationResponseDto.
   * @throws NotFoundException If the location is not found.
   */
  async findOne(id: string, caller: AuthenticatedUser): Promise<LocationResponseDto> {
    if (!UUID_PATTERN.test(id)) {
      throw new NotFoundException(`Invalid Location ID: ${id}`);
    }

    // The owner, the site contact and the slots are all on the store-detail
    // screen, so one read here saves the recipient app three round trips.
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: {
        retailer: true,
        recipient: true,
        contacts: true,
        pickupSlots: true,
      },
    });

    if (!location) {
      throw new NotFoundException(
        `Location with ID: ${id} not found or not valid`,
      );
    }

    assertOwn(caller, location, 'Location');

    return new LocationResponseDto(location);
  }

  /**
   * Retrieves every location belonging to a retailer.
   * @param retailerId The ID of the owning retailer.
   * @returns A Promise that resolves with the locations mapped to LocationResponseDto.
   */
  async findAllByRetailer(retailerId: string): Promise<LocationResponseDto[]> {
    const locations = await this.locationRepository.find({
      where: { retailerId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });

    return locations.map((location) => new LocationResponseDto(location));
  }

  /**
   * Retrieves every location belonging to a recipient.
   * @param recipientId The ID of the owning recipient.
   * @returns A Promise that resolves with the locations mapped to LocationResponseDto.
   */
  async findAllByRecipient(
    recipientId: string,
  ): Promise<LocationResponseDto[]> {
    const locations = await this.locationRepository.find({
      where: { recipientId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });

    return locations.map((location) => new LocationResponseDto(location));
  }

  /**
   * Creates a location.
   * @param createLocationDto The data to create the location with.
   * @returns A Promise that resolves with the created location and a success message.
   * @throws BadRequestException If the owner is not exactly one of retailer or
   * recipient, or the owner already has a primary location.
   */
  async create(
    createLocationDto: CreateLocationDto,
    caller: AuthenticatedUser,
  ): Promise<LocationCreatedResponseDto> {
    assertCanCreateFor(caller, createLocationDto);

    const { retailerId, recipientId, isPrimary } = createLocationDto;

    assertSingleOwner('location', retailerId, recipientId);

    if (isPrimary) {
      await this.assertNoOtherPrimary(retailerId, recipientId);
    }

    const location = this.locationRepository.create({
      ...createLocationDto,
      retailerId: retailerId ?? null,
      recipientId: recipientId ?? null,
    });

    const newLocation = await this.locationRepository.save(location);

    return new LocationCreatedResponseDto(
      newLocation,
      'Location created successfully.',
    );
  }

  /**
   * Updates a location found by its ID.
   * @param id The ID of the location to update.
   * @param updateLocationDto The new data for the location.
   * @returns A Promise that resolves with the updated location and a success message.
   * @throws NotFoundException If the location is not found.
   * @throws BadRequestException If the resulting owner is not exactly one of
   * retailer or recipient, or the owner already has another primary location.
   */
  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
    caller: AuthenticatedUser,
  ): Promise<LocationCreatedResponseDto> {
    const { retailerId, recipientId, ...rest } = updateLocationDto;

    const location = await this.findValid(id);

    assertOwn(caller, location, 'Location');

    Object.assign(location, rest);

    if (retailerId !== undefined) {
      location.retailerId = retailerId;
    }

    if (recipientId !== undefined) {
      location.recipientId = recipientId;
    }

    assertSingleOwner('location', location.retailerId, location.recipientId);

    if (location.isPrimary) {
      await this.assertNoOtherPrimary(
        location.retailerId,
        location.recipientId,
        location.id,
      );
    }

    const updatedLocation = await this.locationRepository.save(location);

    return new LocationCreatedResponseDto(
      updatedLocation,
      'Location updated successfully.',
    );
  }

  /**
   * Soft-deletes a location.
   * @param id The ID of the location to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the location is not found.
   */
  async remove(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    const location = await this.findValid(id);

    assertOwn(caller, location, 'Location');

    await this.locationRepository.softRemove(location);

    return new MessageResponseDto('Location deleted successfully.');
  }

  /**
   * Checks the partial unique index that allows only one primary location per
   * owner, so a violation surfaces as a 400 rather than a driver error.
   * @param retailerId The owning retailer, if any.
   * @param recipientId The owning recipient, if any.
   * @param excludeId A location to ignore, used when updating that location.
   * @throws BadRequestException If the owner already has a primary location.
   */
  private async assertNoOtherPrimary(
    retailerId?: string | null,
    recipientId?: string | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.locationRepository.findOne({
      where: {
        isPrimary: true,
        retailerId: retailerId ?? IsNull(),
        recipientId: recipientId ?? IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'This owner already has a primary location. Clear the existing one first.',
      );
    }
  }
}
