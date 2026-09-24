import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
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
  CreatePartnershipDto,
  PartnershipCreatedResponseDto,
  PartnershipResponseDto,
  UpdatePartnershipDto,
} from './dto/index.js';
import { PartnershipsService } from './partnerships.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import type { RequestWithUser } from '../common/interfaces/index.js';

@ApiTags('partnerships')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('partnerships')
export class PartnershipsController {
  constructor(private readonly partnershipsService: PartnershipsService) {}

  /**
   * Retrieves every partnership, each mapped to a PartnershipResponseDto.
   * @returns A Promise that resolves with an array of PartnershipResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all partnerships' })
  @ApiOkResponse({
    description: 'List of all partnerships.',
    type: [PartnershipResponseDto],
  })
  async findAll(
    @Req() request: RequestWithUser,
  ): Promise<PartnershipResponseDto[]> {
    return await this.partnershipsService.findAll(request.user);
  }

  /**
   * Retrieves every partnership belonging to one retailer.
   * @param retailerId The ID of the owning retailer.
   * @returns A Promise that resolves with an array of PartnershipResponseDto.
   */
  @Get('by-retailer/:retailerId')
  @ApiOperation({ summary: "Get one retailer's partnerships" })
  @ApiParam({ name: 'retailerId', description: 'Retailer ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'List of partnerships.',
    type: [PartnershipResponseDto],
  })
  async findAllByRetailer(
    @Param('retailerId', ParseUUIDPipe) retailerId: string,
  ): Promise<PartnershipResponseDto[]> {
    return await this.partnershipsService.findAllByRetailer(retailerId);
  }

  /**
   * Retrieves a partnership by its ID.
   * @param id The ID of the partnership to look up.
   * @returns A Promise that resolves with the partnership found as PartnershipResponseDto.
   * @throws NotFoundException If the partnership is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single partnership' })
  @ApiParam({ name: 'id', description: 'Partnership ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Partnership found.',
    type: PartnershipResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Partnership not found.' })
  async findOne(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PartnershipResponseDto> {
    return await this.partnershipsService.findOne(id, request.user);
  }

  /**
   * Creates a partnership.
   * @param createPartnershipDto The data to create the partnership with.
   * @returns A Promise that resolves with the created partnership as PartnershipCreatedResponseDto.
   * @throws BadRequestException If these two organizations are already partnered.
   */
  @Post()
  @Roles(UserRole.RETAILER)
  @ApiOperation({ summary: 'Create a new partnership' })
  @ApiBody({
    type: CreatePartnershipDto,
    description: 'Data to create a new partnership.',
  })
  @ApiCreatedResponse({
    description: 'The partnership has been created successfully.',
    type: PartnershipCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data — these two organizations are already partnered.',
  })
  async create(
    @Req() request: RequestWithUser,
    @Body() createPartnershipDto: CreatePartnershipDto,
  ): Promise<PartnershipCreatedResponseDto> {
    return await this.partnershipsService.create(createPartnershipDto, request.user);
  }

  /**
   * Updates a partnership found by its ID.
   * @param id The ID of the partnership to update.
   * @param updatePartnershipDto The new data for the partnership.
   * @returns A Promise that resolves with the updated partnership as PartnershipCreatedResponseDto.
   * @throws NotFoundException If the partnership is not found.
   * @throws BadRequestException If the change would duplicate an existing partnership.
   */
  @Patch(':id')
  @Roles(UserRole.RETAILER)
  @ApiOperation({ summary: 'Update a partnership' })
  @ApiParam({
    name: 'id',
    description: 'ID of the partnership to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdatePartnershipDto,
    description: 'New data for the partnership.',
  })
  @ApiOkResponse({
    description: 'Partnership updated successfully.',
    type: PartnershipCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Partnership not found.' })
  @ApiBadRequestResponse({
    description:
      'Invalid data — these two organizations are already partnered.',
  })
  async update(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartnershipDto: UpdatePartnershipDto,
  ): Promise<PartnershipCreatedResponseDto> {
    return await this.partnershipsService.update(id, updatePartnershipDto, request.user);
  }

  /**
   * Soft-deletes a partnership. Prefer setting the status to `ENDED`.
   * @param id The ID of the partnership to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the partnership is not found.
   */
  @Delete(':id')
  @Roles(UserRole.RETAILER)
  @ApiOperation({ summary: 'Delete a partnership by its ID' })
  @ApiParam({ name: 'id', description: 'Partnership ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Partnership deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Partnership not found.' })
  async remove(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.partnershipsService.remove(id, request.user);
  }
}
