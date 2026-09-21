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
  CreateImpactFactorDto,
  ImpactFactorCreatedResponseDto,
  ImpactFactorResponseDto,
  UpdateImpactFactorDto,
} from './dto/index.js';
import { ImpactFactorsService } from './impact-factors.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@ApiTags('impact-factors')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('impact-factors')
export class ImpactFactorsController {
  constructor(private readonly impactFactorsService: ImpactFactorsService) {}

  /**
   * Retrieves every factor set, each mapped to a ImpactFactorResponseDto.
   * @returns A Promise that resolves with an array of ImpactFactorResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all factor sets' })
  @ApiOkResponse({
    description: 'List of all factor sets.',
    type: [ImpactFactorResponseDto],
  })
  async findAll(): Promise<ImpactFactorResponseDto[]> {
    return await this.impactFactorsService.findAll();
  }

  /**
   * Retrieves a factor set by its ID.
   * @param id The ID of the factor set to look up.
   * @returns A Promise that resolves with the factor set found as ImpactFactorResponseDto.
   * @throws NotFoundException If the factor set is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single factor set' })
  @ApiParam({ name: 'id', description: 'ImpactFactor ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'ImpactFactor found.',
    type: ImpactFactorResponseDto,
  })
  @ApiNotFoundResponse({ description: 'ImpactFactor not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImpactFactorResponseDto> {
    return await this.impactFactorsService.findOne(id);
  }

  /**
   * Creates a factor set.
   * @param createImpactFactorDto The data to create the factor set with.
   * @returns A Promise that resolves with the created factor set as ImpactFactorCreatedResponseDto.
   * @throws BadRequestException If the effective period overlaps an existing set.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new factor set' })
  @ApiBody({
    type: CreateImpactFactorDto,
    description: 'Data to create a new factor set.',
  })
  @ApiCreatedResponse({
    description: 'The factor set has been created successfully.',
    type: ImpactFactorCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data — the effective period overlaps an existing set.',
  })
  async create(
    @Body() createImpactFactorDto: CreateImpactFactorDto,
  ): Promise<ImpactFactorCreatedResponseDto> {
    return await this.impactFactorsService.create(createImpactFactorDto);
  }

  /**
   * Updates a factor set found by its ID.
   * @param id The ID of the factor set to update.
   * @param updateImpactFactorDto The new data for the factor set.
   * @returns A Promise that resolves with the updated factor set as ImpactFactorCreatedResponseDto.
   * @throws NotFoundException If the factor set is not found.
   * @throws BadRequestException If the change would overlap an existing set.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a factor set' })
  @ApiParam({
    name: 'id',
    description: 'ID of the factor set to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateImpactFactorDto,
    description: 'New data for the factor set.',
  })
  @ApiOkResponse({
    description: 'ImpactFactor updated successfully.',
    type: ImpactFactorCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'ImpactFactor not found.' })
  @ApiBadRequestResponse({
    description:
      'Invalid data — the effective period overlaps an existing set.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateImpactFactorDto: UpdateImpactFactorDto,
  ): Promise<ImpactFactorCreatedResponseDto> {
    return await this.impactFactorsService.update(id, updateImpactFactorDto);
  }

  /**
   * Soft-deletes a factor set. Certificates already issued keep pointing at it.
   * @param id The ID of the factor set to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the factor set is not found.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a factor set by its ID' })
  @ApiParam({ name: 'id', description: 'ImpactFactor ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'ImpactFactor deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'ImpactFactor not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.impactFactorsService.remove(id);
  }
}
