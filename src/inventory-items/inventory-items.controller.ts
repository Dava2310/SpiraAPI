import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { MessageResponseDto } from '../common/dto/index.js';
import {
  CreateInventoryItemDto,
  InventoryItemCreatedResponseDto,
  InventoryItemResponseDto,
  UpdateInventoryItemDto,
} from './dto/index.js';
import { InventoryItemStatus } from './enums/inventory-item-status.enum.js';
import { InventoryItemsService } from './inventory-items.service.js';

@ApiTags('inventory-items')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  /**
   * Retrieves every stock lot, each mapped to an InventoryItemResponseDto.
   * @returns A Promise that resolves with an array of InventoryItemResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiOkResponse({
    description: 'List of all inventory items.',
    type: [InventoryItemResponseDto],
  })
  async findAll(): Promise<InventoryItemResponseDto[]> {
    return await this.inventoryItemsService.findAll();
  }

  /**
   * Retrieves one branch's stock, optionally narrowed to a single status.
   * @param locationId The ID of the branch.
   * @param status Only return lots in this state, when given.
   * @returns A Promise that resolves with an array of InventoryItemResponseDto.
   */
  @Get('by-location/:locationId')
  @ApiOperation({ summary: "Get one branch's inventory" })
  @ApiParam({ name: 'locationId', description: 'Location ID', format: 'uuid' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: InventoryItemStatus,
    enumName: 'InventoryItemStatus',
    description: 'Narrow the list to one lifecycle state.',
  })
  @ApiOkResponse({
    description: 'List of inventory items.',
    type: [InventoryItemResponseDto],
  })
  async findAllByLocation(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Query('status') status?: InventoryItemStatus,
  ): Promise<InventoryItemResponseDto[]> {
    return await this.inventoryItemsService.findAllByLocation(
      locationId,
      status,
    );
  }

  /**
   * Retrieves the available lots at a branch that are close to their best-by date.
   * @param locationId The ID of the branch.
   * @param withinDays How many days ahead to look.
   * @returns A Promise that resolves with an array of InventoryItemResponseDto.
   */
  @Get('by-location/:locationId/expiring')
  @ApiOperation({ summary: "Get one branch's near-expiry inventory" })
  @ApiParam({ name: 'locationId', description: 'Location ID', format: 'uuid' })
  @ApiQuery({
    name: 'withinDays',
    required: false,
    type: Number,
    description: 'How many days ahead to look. Defaults to 1.',
  })
  @ApiOkResponse({
    description: 'List of near-expiry inventory items.',
    type: [InventoryItemResponseDto],
  })
  async findExpiringAtLocation(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Query('withinDays', new ParseIntPipe({ optional: true }))
    withinDays?: number,
  ): Promise<InventoryItemResponseDto[]> {
    return await this.inventoryItemsService.findExpiringAtLocation(
      locationId,
      withinDays,
    );
  }

  /**
   * Retrieves a stock lot by its ID.
   * @param id The ID of the lot to look up.
   * @returns A Promise that resolves with the lot found as InventoryItemResponseDto.
   * @throws NotFoundException If the lot is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single inventory item' })
  @ApiParam({ name: 'id', description: 'Inventory item ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Inventory item found.',
    type: InventoryItemResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InventoryItemResponseDto> {
    return await this.inventoryItemsService.findOne(id);
  }

  /**
   * Logs a lot of stock as donatable.
   * @param createInventoryItemDto The data to create the lot with.
   * @returns A Promise that resolves with the created lot as InventoryItemCreatedResponseDto.
   */
  @Post()
  @ApiOperation({ summary: 'Log a new inventory item' })
  @ApiBody({
    type: CreateInventoryItemDto,
    description: 'Data to log a new inventory item.',
  })
  @ApiCreatedResponse({
    description: 'The inventory item has been created successfully.',
    type: InventoryItemCreatedResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data.' })
  async create(
    @Body() createInventoryItemDto: CreateInventoryItemDto,
  ): Promise<InventoryItemCreatedResponseDto> {
    return await this.inventoryItemsService.create(createInventoryItemDto);
  }

  /**
   * Updates a stock lot found by its ID.
   * @param id The ID of the lot to update.
   * @param updateInventoryItemDto The new data for the lot.
   * @returns A Promise that resolves with the updated lot as InventoryItemCreatedResponseDto.
   * @throws NotFoundException If the lot is not found.
   * @throws BadRequestException If the lot is already committed to a donation.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update an inventory item' })
  @ApiParam({
    name: 'id',
    description: 'ID of the inventory item to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateInventoryItemDto,
    description: 'New data for the inventory item.',
  })
  @ApiOkResponse({
    description: 'Inventory item updated successfully.',
    type: InventoryItemCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  @ApiBadRequestResponse({
    description: 'The inventory item is already committed to a donation.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
  ): Promise<InventoryItemCreatedResponseDto> {
    return await this.inventoryItemsService.update(id, updateInventoryItemDto);
  }

  /**
   * Soft-deletes a stock lot that was logged by mistake.
   * @param id The ID of the lot to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the lot is not found.
   * @throws BadRequestException If the lot is already committed to a donation.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inventory item by its ID' })
  @ApiParam({ name: 'id', description: 'Inventory item ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Inventory item deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  @ApiBadRequestResponse({
    description: 'The inventory item is already committed to a donation.',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.inventoryItemsService.remove(id);
  }
}
