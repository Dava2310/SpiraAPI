import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/index.js';
import { MessageResponseDto } from '../common/dto/index.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import {
  CreateLocationPickupSlotDto,
  LocationPickupSlotCreatedResponseDto,
  LocationPickupSlotResponseDto,
  UpdateLocationPickupSlotDto,
} from './dto/index.js';
import { LocationPickupSlotsService } from './location-pickup-slots.service.js';

@ApiTags('location-pickup-slots')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('location-pickup-slots')
export class LocationPickupSlotsController {
  constructor(
    private readonly locationPickupSlotsService: LocationPickupSlotsService,
  ) {}

  /**
   * Retrieves every slot, each mapped to a LocationPickupSlotResponseDto.
   * @returns A Promise that resolves with an array of LocationPickupSlotResponseDto.
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all pickup slots' })
  @ApiOkResponse({
    description: 'List of all pickup slots.',
    type: [LocationPickupSlotResponseDto],
  })
  async findAll(): Promise<LocationPickupSlotResponseDto[]> {
    return await this.locationPickupSlotsService.findAll();
  }

  /**
   * Retrieves the slots one branch currently offers.
   * @param locationId The ID of the branch.
   * @returns A Promise that resolves with an array of LocationPickupSlotResponseDto.
   */
  @Get('by-location/:locationId')
  @ApiOperation({ summary: "Get one branch's active pickup slots" })
  @ApiParam({ name: 'locationId', description: 'Location ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'List of active pickup slots.',
    type: [LocationPickupSlotResponseDto],
  })
  async findAllByLocation(
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ): Promise<LocationPickupSlotResponseDto[]> {
    return await this.locationPickupSlotsService.findAllByLocation(locationId);
  }

  /**
   * Retrieves a slot by its ID.
   * @param id The ID of the slot to look up.
   * @returns A Promise that resolves with the slot found as LocationPickupSlotResponseDto.
   * @throws NotFoundException If the slot is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single pickup slot' })
  @ApiParam({
    name: 'id',
    description: 'LocationPickupSlot ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'LocationPickupSlot found.',
    type: LocationPickupSlotResponseDto,
  })
  @ApiNotFoundResponse({ description: 'LocationPickupSlot not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LocationPickupSlotResponseDto> {
    return await this.locationPickupSlotsService.findOne(id);
  }

  /**
   * Offers a new collection window at a branch.
   * @param createLocationPickupSlotDto The data to create the slot with.
   * @returns A Promise that resolves with the created slot as LocationPickupSlotCreatedResponseDto.
   * @throws BadRequestException If the window is inverted or already offered.
   */
  @Post()
  @Roles(UserRole.RETAILER)
  @ApiOperation({ summary: 'Offer a new pickup slot' })
  @ApiBody({
    type: CreateLocationPickupSlotDto,
    description: 'Data to create a new pickup slot.',
  })
  @ApiCreatedResponse({
    description: 'The pickup slot has been created successfully.',
    type: LocationPickupSlotCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data — the window is inverted, or the branch already offers it.',
  })
  @ApiForbiddenResponse({ description: 'Only a retailer may offer slots.' })
  async create(
    @Body() createLocationPickupSlotDto: CreateLocationPickupSlotDto,
  ): Promise<LocationPickupSlotCreatedResponseDto> {
    return await this.locationPickupSlotsService.create(
      createLocationPickupSlotDto,
    );
  }

  /**
   * Edits a slot found by its ID.
   * @param id The ID of the slot to update.
   * @param updateLocationPickupSlotDto The new values.
   * @returns A Promise that resolves with the updated slot as LocationPickupSlotCreatedResponseDto.
   * @throws NotFoundException If the slot is not found.
   * @throws BadRequestException If the resulting window is inverted.
   */
  @Patch(':id')
  @Roles(UserRole.RETAILER)
  @ApiOperation({ summary: 'Update a pickup slot' })
  @ApiParam({
    name: 'id',
    description: 'ID of the pickup slot to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateLocationPickupSlotDto,
    description: 'New values for the pickup slot.',
  })
  @ApiOkResponse({
    description: 'LocationPickupSlot updated successfully.',
    type: LocationPickupSlotCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'LocationPickupSlot not found.' })
  @ApiBadRequestResponse({
    description: 'Invalid data — the window is inverted.',
  })
  @ApiForbiddenResponse({ description: 'Only a retailer may edit slots.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationPickupSlotDto: UpdateLocationPickupSlotDto,
  ): Promise<LocationPickupSlotCreatedResponseDto> {
    return await this.locationPickupSlotsService.update(
      id,
      updateLocationPickupSlotDto,
    );
  }

  /**
   * Soft-deletes a slot. Prefer setting `isActive` to false to retire one.
   * @param id The ID of the slot to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the slot is not found.
   */
  @Delete(':id')
  @Roles(UserRole.RETAILER)
  @ApiOperation({ summary: 'Delete a pickup slot by its ID' })
  @ApiParam({
    name: 'id',
    description: 'LocationPickupSlot ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'LocationPickupSlot deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'LocationPickupSlot not found.' })
  @ApiForbiddenResponse({ description: 'Only a retailer may delete slots.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.locationPickupSlotsService.remove(id);
  }
}
