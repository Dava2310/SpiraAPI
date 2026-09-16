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
  CreateRetailerDto,
  RetailerCreatedResponseDto,
  RetailerResponseDto,
  UpdateRetailerDto,
} from './dto/index.js';
import { RetailersService } from './retailers.service.js';

@ApiTags('retailers')
@Controller('retailers')
export class RetailersController {
  constructor(private readonly retailersService: RetailersService) {}

  /**
   * Retrieves every retailer, each mapped to a RetailerResponseDto.
   * @returns A Promise that resolves with an array of RetailerResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all retailers' })
  @ApiOkResponse({
    description: 'List of all retailers.',
    type: [RetailerResponseDto],
  })
  async findAll(): Promise<RetailerResponseDto[]> {
    return await this.retailersService.findAll();
  }

  /**
   * Retrieves a retailer by its ID.
   * @param id The ID of the retailer to look up.
   * @returns A Promise that resolves with the retailer found as RetailerResponseDto.
   * @throws NotFoundException If the retailer is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single retailer' })
  @ApiParam({ name: 'id', description: 'Retailer ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Retailer found.',
    type: RetailerResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Retailer not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RetailerResponseDto> {
    return await this.retailersService.findOne(id);
  }

  /**
   * Creates a retailer.
   * @param createRetailerDto The data to create the retailer with.
   * @returns A Promise that resolves with the created retailer as RetailerCreatedResponseDto.
   * @throws BadRequestException If the slug or the tax ID is already taken.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new retailer' })
  @ApiBody({
    type: CreateRetailerDto,
    description: 'Data to create a new retailer.',
  })
  @ApiCreatedResponse({
    description: 'The retailer has been created successfully.',
    type: RetailerCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid data — the slug or the tax ID is already taken.',
  })
  async create(
    @Body() createRetailerDto: CreateRetailerDto,
  ): Promise<RetailerCreatedResponseDto> {
    return await this.retailersService.create(createRetailerDto);
  }

  /**
   * Updates a retailer found by its ID.
   * @param id The ID of the retailer to update.
   * @param updateRetailerDto The new data for the retailer.
   * @returns A Promise that resolves with the updated retailer as RetailerCreatedResponseDto.
   * @throws NotFoundException If the retailer is not found.
   * @throws BadRequestException If the slug or the tax ID is taken by another retailer.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a retailer' })
  @ApiParam({
    name: 'id',
    description: 'ID of the retailer to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateRetailerDto,
    description: 'New data for the retailer.',
  })
  @ApiOkResponse({
    description: 'Retailer updated successfully.',
    type: RetailerCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Retailer not found.' })
  @ApiBadRequestResponse({
    description: 'Invalid data — the slug or the tax ID is already taken.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRetailerDto: UpdateRetailerDto,
  ): Promise<RetailerCreatedResponseDto> {
    return await this.retailersService.update(id, updateRetailerDto);
  }

  /**
   * Soft-deletes a retailer, freeing its slug and tax ID for reuse.
   * @param id The ID of the retailer to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the retailer is not found.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a retailer by its ID' })
  @ApiParam({ name: 'id', description: 'Retailer ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Retailer deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Retailer not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.retailersService.remove(id);
  }
}
