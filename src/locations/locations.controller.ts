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
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { MessageResponseDto } from '../common/dto/index.js';
import {
  CreateLocationDto,
  LocationCreatedResponseDto,
  LocationResponseDto,
  UpdateLocationDto,
} from './dto/index.js';
import { LocationsService } from './locations.service.js';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * Retrieves every location, each mapped to a LocationResponseDto.
   * @returns A Promise that resolves with an array of LocationResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all locations' })
  @ApiOkResponse({
    description: 'List of all locations.',
    type: [LocationResponseDto],
  })
  async findAll(): Promise<LocationResponseDto[]> {
    return await this.locationsService.findAll();
  }

  /**
   * Retrieves a location by its ID.
   * @param id The ID of the location to look up.
   * @returns A Promise that resolves with the location found as LocationResponseDto.
   * @throws NotFoundException If the location is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single location' })
  @ApiParam({ name: 'id', description: 'Location ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Location found.',
    type: LocationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Location not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LocationResponseDto> {
    return await this.locationsService.findOne(id);
  }

  /**
   * Creates a location.
   * @param createLocationDto The data to create the location with.
   * @returns A Promise that resolves with the created location as LocationCreatedResponseDto.
   * @throws BadRequestException If the owner is not exactly one of retailer/recipient, or the owner already has a primary location.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new location' })
  @ApiBody({
    type: CreateLocationDto,
    description: 'Data to create a new location.',
  })
  @ApiCreatedResponse({
    description: 'The location has been created successfully.',
    type: LocationCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data — owner is not exactly one of retailer/recipient, or the owner already has a primary location.',
  })
  async create(
    @Body() createLocationDto: CreateLocationDto,
  ): Promise<LocationCreatedResponseDto> {
    return await this.locationsService.create(createLocationDto);
  }

  /**
   * Updates a location found by its ID.
   * @param id The ID of the location to update.
   * @param updateLocationDto The new data for the location.
   * @returns A Promise that resolves with the updated location as LocationCreatedResponseDto.
   * @throws NotFoundException If the location is not found.
   * @throws BadRequestException If the resulting owner is not exactly one of retailer/recipient, or the owner already has a primary location.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiParam({
    name: 'id',
    description: 'ID of the location to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateLocationDto,
    description: 'New data for the location.',
  })
  @ApiOkResponse({
    description: 'Location updated successfully.',
    type: LocationCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Location not found.' })
  @ApiBadRequestResponse({
    description:
      'Invalid data — owner is not exactly one of retailer/recipient, or the owner already has a primary location.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<LocationCreatedResponseDto> {
    return await this.locationsService.update(id, updateLocationDto);
  }

  /**
   * Soft-deletes a location.
   * @param id The ID of the location to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the location is not found.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location by its ID' })
  @ApiParam({ name: 'id', description: 'Location ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Location deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Location not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.locationsService.remove(id);
  }
}
