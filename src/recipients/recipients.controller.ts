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

import { MessageResponseDto } from '../common/dto/index.js';
import {
  CreateRecipientDto,
  RecipientCreatedResponseDto,
  RecipientResponseDto,
  UpdateRecipientDto,
} from './dto/index.js';
import { RecipientsService } from './recipients.service.js';
import { Roles } from '../common/decorators/index.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@ApiTags('recipients')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('recipients')
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  /**
   * Retrieves every recipient, each mapped to a RecipientResponseDto.
   * @returns A Promise that resolves with an array of RecipientResponseDto.
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all recipients' })
  @ApiOkResponse({
    description: 'List of all recipients.',
    type: [RecipientResponseDto],
  })
  async findAll(): Promise<RecipientResponseDto[]> {
    return await this.recipientsService.findAll();
  }

  /**
   * Retrieves a recipient by its ID.
   * @param id The ID of the recipient to look up.
   * @returns A Promise that resolves with the recipient found as RecipientResponseDto.
   * @throws NotFoundException If the recipient is not found.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a single recipient' })
  @ApiParam({ name: 'id', description: 'Recipient ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Recipient found.',
    type: RecipientResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Recipient not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecipientResponseDto> {
    return await this.recipientsService.findOne(id);
  }

  /**
   * Creates a recipient.
   * @param createRecipientDto The data to create the recipient with.
   * @returns A Promise that resolves with the created recipient as RecipientCreatedResponseDto.
   * @throws BadRequestException If the tax ID is already taken.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new recipient' })
  @ApiBody({
    type: CreateRecipientDto,
    description: 'Data to create a new recipient.',
  })
  @ApiCreatedResponse({
    description: 'The recipient has been created successfully.',
    type: RecipientCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid data — the tax ID is already taken.',
  })
  async create(
    @Body() createRecipientDto: CreateRecipientDto,
  ): Promise<RecipientCreatedResponseDto> {
    return await this.recipientsService.create(createRecipientDto);
  }

  /**
   * Updates a recipient found by its ID.
   * @param id The ID of the recipient to update.
   * @param updateRecipientDto The new data for the recipient.
   * @returns A Promise that resolves with the updated recipient as RecipientCreatedResponseDto.
   * @throws NotFoundException If the recipient is not found.
   * @throws BadRequestException If the tax ID is taken by another recipient.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a recipient' })
  @ApiParam({
    name: 'id',
    description: 'ID of the recipient to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateRecipientDto,
    description: 'New data for the recipient.',
  })
  @ApiOkResponse({
    description: 'Recipient updated successfully.',
    type: RecipientCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Recipient not found.' })
  @ApiBadRequestResponse({
    description: 'Invalid data — the tax ID is already taken.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRecipientDto: UpdateRecipientDto,
  ): Promise<RecipientCreatedResponseDto> {
    return await this.recipientsService.update(id, updateRecipientDto);
  }

  /**
   * Soft-deletes a recipient, freeing its tax ID for reuse.
   * @param id The ID of the recipient to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the recipient is not found.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recipient by its ID' })
  @ApiParam({ name: 'id', description: 'Recipient ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Recipient deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Recipient not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.recipientsService.remove(id);
  }
}
