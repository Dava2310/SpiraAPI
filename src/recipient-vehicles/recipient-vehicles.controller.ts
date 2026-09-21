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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/index.js';
import { MessageResponseDto } from '../common/dto/index.js';
import {
  CreateRecipientVehicleDto,
  RecipientVehicleCreatedResponseDto,
  RecipientVehicleResponseDto,
  UpdateRecipientVehicleDto,
} from './dto/index.js';
import { RecipientVehiclesService } from './recipient-vehicles.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@ApiTags('recipient-vehicles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('recipient-vehicles')
export class RecipientVehiclesController {
  constructor(
    private readonly recipientVehiclesService: RecipientVehiclesService,
  ) {}

  /**
   * Retrieves every vehicle, each mapped to a RecipientVehicleResponseDto.
   * @returns A Promise that resolves with an array of RecipientVehicleResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiOkResponse({
    description: 'List of all vehicles.',
    type: [RecipientVehicleResponseDto],
  })
  async findAll(): Promise<RecipientVehicleResponseDto[]> {
    return await this.recipientVehiclesService.findAll();
  }

  /**
   * Retrieves every vehicle belonging to one recipient.
   * @param recipientId The ID of the owning recipient.
   * @returns A Promise that resolves with an array of RecipientVehicleResponseDto.
   */
  @Get('by-recipient/:recipientId')
  @ApiOperation({ summary: "Get one recipient's vehicles" })
  @ApiParam({
    name: 'recipientId',
    description: 'Recipient ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'List of vehicles.',
    type: [RecipientVehicleResponseDto],
  })
  async findAllByRecipient(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
  ): Promise<RecipientVehicleResponseDto[]> {
    return await this.recipientVehiclesService.findAllByRecipient(recipientId);
  }

  /**
   * Retrieves a vehicle by its ID.
   * @param id The ID of the vehicle to look up.
   * @returns A Promise that resolves with the vehicle found as RecipientVehicleResponseDto.
   * @throws NotFoundException If the vehicle is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single vehicle' })
  @ApiParam({ name: 'id', description: 'RecipientVehicle ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'RecipientVehicle found.',
    type: RecipientVehicleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'RecipientVehicle not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecipientVehicleResponseDto> {
    return await this.recipientVehiclesService.findOne(id);
  }

  /**
   * Creates a vehicle.
   * @param createRecipientVehicleDto The data to create the vehicle with.
   * @returns A Promise that resolves with the created vehicle as RecipientVehicleCreatedResponseDto.
   * @throws BadRequestException If the plate is already registered to this recipient.
   */
  @Post()
  @Roles(UserRole.RECIPIENT)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiBody({
    type: CreateRecipientVehicleDto,
    description: 'Data to create a new vehicle.',
  })
  @ApiCreatedResponse({
    description: 'The vehicle has been created successfully.',
    type: RecipientVehicleCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data — the plate is already registered to this recipient.',
  })
  async create(
    @Body() createRecipientVehicleDto: CreateRecipientVehicleDto,
  ): Promise<RecipientVehicleCreatedResponseDto> {
    return await this.recipientVehiclesService.create(
      createRecipientVehicleDto,
    );
  }

  /**
   * Updates a vehicle found by its ID.
   * @param id The ID of the vehicle to update.
   * @param updateRecipientVehicleDto The new data for the vehicle.
   * @returns A Promise that resolves with the updated vehicle as RecipientVehicleCreatedResponseDto.
   * @throws NotFoundException If the vehicle is not found.
   * @throws BadRequestException If the plate is registered to another vehicle of the same recipient.
   */
  @Patch(':id')
  @Roles(UserRole.RECIPIENT)
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiParam({
    name: 'id',
    description: 'ID of the vehicle to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateRecipientVehicleDto,
    description: 'New data for the vehicle.',
  })
  @ApiOkResponse({
    description: 'RecipientVehicle updated successfully.',
    type: RecipientVehicleCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'RecipientVehicle not found.' })
  @ApiBadRequestResponse({
    description:
      'Invalid data — the plate is already registered to this recipient.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRecipientVehicleDto: UpdateRecipientVehicleDto,
  ): Promise<RecipientVehicleCreatedResponseDto> {
    return await this.recipientVehiclesService.update(
      id,
      updateRecipientVehicleDto,
    );
  }

  /**
   * Soft-deletes a vehicle. Prefer setting `isActive` to false to retire one.
   * @param id The ID of the vehicle to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the vehicle is not found.
   */
  @Delete(':id')
  @Roles(UserRole.RECIPIENT)
  @ApiOperation({ summary: 'Delete a vehicle by its ID' })
  @ApiParam({ name: 'id', description: 'RecipientVehicle ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'RecipientVehicle deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'RecipientVehicle not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.recipientVehiclesService.remove(id);
  }
}
