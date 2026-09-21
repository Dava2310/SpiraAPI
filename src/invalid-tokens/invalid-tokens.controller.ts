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
  CreateInvalidTokenDto,
  InvalidTokenCreatedResponseDto,
  InvalidTokenResponseDto,
  UpdateInvalidTokenDto,
} from './dto/index.js';
import { InvalidTokensService } from './invalid-tokens.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@ApiTags('invalid-tokens')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('invalid-tokens')
export class InvalidTokensController {
  constructor(private readonly invalidTokensService: InvalidTokensService) {}

  /**
   * Retrieves every denylist entry, each mapped to an InvalidTokenResponseDto.
   * @returns A Promise that resolves with an array of InvalidTokenResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all denylist entries' })
  @ApiOkResponse({
    description: 'List of all denylist entries.',
    type: [InvalidTokenResponseDto],
  })
  async findAll(): Promise<InvalidTokenResponseDto[]> {
    return await this.invalidTokensService.findAll();
  }

  /**
   * Retrieves a denylist entry by its ID.
   * @param id The ID of the entry to look up.
   * @returns A Promise that resolves with the entry found as InvalidTokenResponseDto.
   * @throws NotFoundException If the entry is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single denylist entry' })
  @ApiParam({ name: 'id', description: 'Denylist entry ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Denylist entry found.',
    type: InvalidTokenResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Denylist entry not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvalidTokenResponseDto> {
    return await this.invalidTokensService.findOne(id);
  }

  /**
   * Adds a token to the denylist.
   * @param createInvalidTokenDto The data to create the entry with.
   * @returns A Promise that resolves with the created entry as InvalidTokenCreatedResponseDto.
   * @throws BadRequestException If the `jti` is already on the denylist.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke a token' })
  @ApiBody({
    type: CreateInvalidTokenDto,
    description: 'Data to add a token to the denylist.',
  })
  @ApiCreatedResponse({
    description: 'The token has been revoked successfully.',
    type: InvalidTokenCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid data — the jti is already on the denylist.',
  })
  async create(
    @Body() createInvalidTokenDto: CreateInvalidTokenDto,
  ): Promise<InvalidTokenCreatedResponseDto> {
    return await this.invalidTokensService.create(createInvalidTokenDto);
  }

  /**
   * Updates a denylist entry found by its ID.
   * @param id The ID of the entry to update.
   * @param updateInvalidTokenDto The new data for the entry.
   * @returns A Promise that resolves with the updated entry as InvalidTokenCreatedResponseDto.
   * @throws NotFoundException If the entry is not found.
   * @throws BadRequestException If the `jti` is taken by another entry.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a denylist entry' })
  @ApiParam({
    name: 'id',
    description: 'ID of the entry to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateInvalidTokenDto,
    description: 'New data for the denylist entry.',
  })
  @ApiOkResponse({
    description: 'Denylist entry updated successfully.',
    type: InvalidTokenCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Denylist entry not found.' })
  @ApiBadRequestResponse({
    description: 'Invalid data — the jti is already on the denylist.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvalidTokenDto: UpdateInvalidTokenDto,
  ): Promise<InvalidTokenCreatedResponseDto> {
    return await this.invalidTokensService.update(id, updateInvalidTokenDto);
  }

  /**
   * Deletes every entry whose token has already expired.
   * @returns A Promise that resolves with how many entries were purged.
   */
  @Delete('expired')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Purge expired denylist entries',
    description:
      'Removes entries past their expiry. Safe because ordinary JWT validation rejects an expired token anyway.',
  })
  @ApiOkResponse({
    description: 'Expired entries purged.',
    type: MessageResponseDto,
  })
  async purgeExpired(): Promise<MessageResponseDto> {
    return await this.invalidTokensService.purgeExpired();
  }

  /**
   * Permanently deletes a denylist entry, lifting the revocation.
   * @param id The ID of the entry to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the entry is not found.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a denylist entry by its ID' })
  @ApiParam({ name: 'id', description: 'Denylist entry ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Denylist entry deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Denylist entry not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.invalidTokensService.remove(id);
  }
}
