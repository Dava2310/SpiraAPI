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
  ApiExtraModels,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/index.js';
import {
  MessageResponseDto,
  PaginatedResponseDto,
} from '../common/dto/index.js';
import { DonationReason } from '../common/enums/donation-reason.enum.js';
import {
  CreateInventoryItemDto,
  InventoryFacetsResponseDto,
  InventoryItemCreatedResponseDto,
  InventoryItemResponseDto,
  QueryInventoryItemsDto,
  UpdateInventoryItemDto,
} from './dto/index.js';
import { InventoryItemStatus } from './enums/inventory-item-status.enum.js';
import { InventoryItemsService } from './inventory-items.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@ApiTags('inventory-items')
@ApiExtraModels(PaginatedResponseDto, InventoryItemResponseDto)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  /**
   * Searches, filters, orders and pages the inventory list.
   * @param query The filters, ordering and page.
   * @returns A Promise that resolves with one page of lots and its metadata.
   */
  @Get()
  @ApiOperation({ summary: 'Search and page the inventory' })
  @ApiOkResponse({
    description: 'One page of inventory items.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(InventoryItemResponseDto) },
            },
          },
        },
      ],
    },
  })
  async search(
    @Query() query: QueryInventoryItemsDto,
  ): Promise<PaginatedResponseDto<InventoryItemResponseDto>> {
    return await this.inventoryItemsService.search(query);
  }

  /**
   * Retrieves the counts behind the inventory filter chips.
   * @param locationId The branch to count within, when given.
   * @param status The lifecycle state to count.
   * @returns A Promise that resolves with the facet counts.
   */
  @Get('facets')
  @ApiOperation({ summary: 'Get inventory counts per category and urgency' })
  @ApiQuery({
    name: 'locationId',
    required: false,
    format: 'uuid',
    description: 'Branch to count within.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: InventoryItemStatus,
    enumName: 'InventoryItemStatus',
    description: 'Lifecycle state to count. Defaults to IN_INVENTORY.',
  })
  @ApiOkResponse({
    description: 'The facet counts.',
    type: InventoryFacetsResponseDto,
  })
  async facets(
    @Query('locationId') locationId?: string,
    @Query('status') status?: InventoryItemStatus,
  ): Promise<InventoryFacetsResponseDto> {
    return await this.inventoryItemsService.facets(locationId, status);
  }

  /**
   * Retrieves lots that are near expiry or flagged for a given reason.
   * @param locationId The branch to look at, when given.
   * @param withinDays How many days ahead counts as near expiry.
   * @param includeReason A reason to include regardless of the date.
   * @returns A Promise that resolves with an array of InventoryItemResponseDto.
   */
  @Get('expiring')
  @ApiOperation({ summary: 'Get near-expiry or flagged inventory' })
  @ApiQuery({
    name: 'locationId',
    required: false,
    format: 'uuid',
    description: 'Branch to look at.',
  })
  @ApiQuery({
    name: 'withinDays',
    required: false,
    type: Number,
    description: 'How many days ahead to look. Defaults to 2.',
  })
  @ApiQuery({
    name: 'includeReason',
    required: false,
    enum: DonationReason,
    enumName: 'DonationReason',
    description:
      'Include lots flagged for this reason whatever their date. ORed with the expiry window, not ANDed.',
  })
  @ApiOkResponse({
    description: 'List of lots worth acting on.',
    type: [InventoryItemResponseDto],
  })
  async findExpiringOrFlagged(
    @Query('locationId') locationId?: string,
    @Query('withinDays', new ParseIntPipe({ optional: true }))
    withinDays?: number,
    @Query('includeReason') includeReason?: DonationReason,
  ): Promise<InventoryItemResponseDto[]> {
    return await this.inventoryItemsService.findExpiringOrFlagged(
      locationId,
      withinDays,
      includeReason,
    );
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
  @Roles(UserRole.RETAILER)
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
  @Roles(UserRole.RETAILER)
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
  @Roles(UserRole.RETAILER)
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
