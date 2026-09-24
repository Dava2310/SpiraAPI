import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import type { AuthenticatedUser } from '../common/interfaces/index.js';
import {
  assertCanCreateFor,
  assertOwn,
  ownScopeWhere,
} from '../common/scoping/org-scope.js';
import {
  CreateRecipientVehicleDto,
  RecipientVehicleCreatedResponseDto,
  RecipientVehicleResponseDto,
  UpdateRecipientVehicleDto,
} from './dto/index.js';
import { RecipientVehicle } from './entities/recipient-vehicle.entity.js';

/**
 * Business logic for a recipient's collection fleet. Implements
 * {@link CrudRepository} so the "find a valid record or throw" contract is the
 * same across modules.
 */
@Injectable()
export class RecipientVehiclesService implements CrudRepository<RecipientVehicle> {
  constructor(
    @InjectRepository(RecipientVehicle)
    private readonly vehicleRepository: Repository<RecipientVehicle>,
  ) {}

  /**
   * Finds a RecipientVehicle by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the vehicle to look up.
   * @returns A Promise that resolves with the vehicle found.
   * @throws NotFoundException If the vehicle does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<RecipientVehicle> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid RecipientVehicle ID: ${id}`);
    }

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: uuid },
    });

    if (!vehicle) {
      throw new NotFoundException(
        `RecipientVehicle with ID: ${id} not found or not valid`,
      );
    }

    return vehicle;
  }

  /**
   * Retrieves every vehicle that is not soft-deleted.
   * @returns A Promise that resolves with all vehicles mapped to RecipientVehicleResponseDto.
   */
  async findAll(caller: AuthenticatedUser): Promise<RecipientVehicleResponseDto[]> {
    const vehicles = await this.vehicleRepository.find({
      where: ownScopeWhere(caller, { recipient: "recipientId" }) ?? undefined,
      order: { plate: 'ASC' },
    });

    return vehicles.map((vehicle) => new RecipientVehicleResponseDto(vehicle));
  }

  /**
   * Retrieves a single vehicle by its ID.
   * @param id The ID of the vehicle to look up.
   * @returns A Promise that resolves with the vehicle mapped to RecipientVehicleResponseDto.
   * @throws NotFoundException If the vehicle is not found.
   */
  async findOne(id: string, caller: AuthenticatedUser): Promise<RecipientVehicleResponseDto> {
    const vehicle = await this.findValid(id);

    assertOwn(caller, vehicle, 'Vehicle');

    return new RecipientVehicleResponseDto(vehicle);
  }

  /**
   * Retrieves one recipient's fleet, active vehicles first.
   * @param recipientId The ID of the owning recipient.
   * @returns A Promise that resolves with the vehicles mapped to RecipientVehicleResponseDto.
   */
  async findAllByRecipient(
    recipientId: string,
  ): Promise<RecipientVehicleResponseDto[]> {
    const vehicles = await this.vehicleRepository.find({
      where: { recipientId },
      order: { isActive: 'DESC', plate: 'ASC' },
    });

    return vehicles.map((vehicle) => new RecipientVehicleResponseDto(vehicle));
  }

  /**
   * Finds a vehicle by plate within one recipient's fleet.
   * @param recipientId The ID of the owning recipient.
   * @param plate The plate to search for.
   * @returns A Promise that resolves with the vehicle found, or null.
   */
  async findOneByPlate(
    recipientId: string,
    plate: string,
  ): Promise<RecipientVehicle | null> {
    return await this.vehicleRepository.findOne({
      where: { recipientId, plate },
    });
  }

  /**
   * Finds a vehicle by plate within one recipient's fleet, excluding one vehicle
   * from the search by its ID.
   * @param id The ID of the vehicle to exclude from the search.
   * @param recipientId The ID of the owning recipient.
   * @param plate The plate to search for.
   * @returns A Promise that resolves with the vehicle found, or null.
   */
  async findOneByPlateNotId(
    id: string,
    recipientId: string,
    plate: string,
  ): Promise<RecipientVehicle | null> {
    return await this.vehicleRepository.findOne({
      where: { recipientId, plate, id: Not(id) },
    });
  }

  /**
   * Registers a vehicle.
   * @param createRecipientVehicleDto The data to register the vehicle with.
   * @returns A Promise that resolves with the created vehicle and a success message.
   * @throws BadRequestException If the plate is already registered to this recipient.
   */
  async create(
    createRecipientVehicleDto: CreateRecipientVehicleDto,
    caller: AuthenticatedUser,
  ): Promise<RecipientVehicleCreatedResponseDto> {
    assertCanCreateFor(caller, createRecipientVehicleDto);

    const { recipientId, plate } = createRecipientVehicleDto;

    if (await this.findOneByPlate(recipientId, plate)) {
      throw new BadRequestException(
        `This recipient already has a vehicle with the plate: ${plate}`,
      );
    }

    const vehicle = this.vehicleRepository.create(createRecipientVehicleDto);
    const newVehicle = await this.vehicleRepository.save(vehicle);

    return new RecipientVehicleCreatedResponseDto(
      newVehicle,
      'Vehicle registered successfully.',
    );
  }

  /**
   * Updates a vehicle found by its ID.
   * @param id The ID of the vehicle to update.
   * @param updateRecipientVehicleDto The new data for the vehicle.
   * @returns A Promise that resolves with the updated vehicle and a success message.
   * @throws NotFoundException If the vehicle is not found.
   * @throws BadRequestException If the plate is registered to another vehicle of
   * the same recipient.
   */
  async update(
    id: string,
    updateRecipientVehicleDto: UpdateRecipientVehicleDto,
    caller: AuthenticatedUser,
  ): Promise<RecipientVehicleCreatedResponseDto> {
    const vehicle = await this.findValid(id);

    assertOwn(caller, vehicle, 'Vehicle');
    const { plate } = updateRecipientVehicleDto;

    if (
      plate &&
      (await this.findOneByPlateNotId(vehicle.id, vehicle.recipientId, plate))
    ) {
      throw new BadRequestException(
        `Another vehicle of this recipient already uses the plate: ${plate}`,
      );
    }

    Object.assign(vehicle, updateRecipientVehicleDto);

    const updatedVehicle = await this.vehicleRepository.save(vehicle);

    return new RecipientVehicleCreatedResponseDto(
      updatedVehicle,
      'Vehicle updated successfully.',
    );
  }

  /**
   * Soft-deletes a vehicle. Donations that recorded it keep their reference,
   * because the foreign key is `SET NULL` only on a hard delete.
   * @param id The ID of the vehicle to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the vehicle is not found.
   */
  async remove(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    const vehicle = await this.findValid(id);

    assertOwn(caller, vehicle, 'Vehicle');

    await this.vehicleRepository.softRemove(vehicle);

    return new MessageResponseDto('Vehicle deleted successfully.');
  }
}
