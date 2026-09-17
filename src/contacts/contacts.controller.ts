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
  CreateContactDto,
  ContactCreatedResponseDto,
  ContactResponseDto,
  UpdateContactDto,
} from './dto/index.js';
import { ContactsService } from './contacts.service.js';

@ApiTags('contacts')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * Retrieves every contact, each mapped to a ContactResponseDto.
   * @returns A Promise that resolves with an array of ContactResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all contacts' })
  @ApiOkResponse({
    description: 'List of all contacts.',
    type: [ContactResponseDto],
  })
  async findAll(): Promise<ContactResponseDto[]> {
    return await this.contactsService.findAll();
  }

  /**
   * Retrieves a contact by its ID.
   * @param id The ID of the contact to look up.
   * @returns A Promise that resolves with the contact found as ContactResponseDto.
   * @throws NotFoundException If the contact is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single contact' })
  @ApiParam({ name: 'id', description: 'Contact ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Contact found.',
    type: ContactResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Contact not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContactResponseDto> {
    return await this.contactsService.findOne(id);
  }

  /**
   * Creates a contact.
   * @param createContactDto The data to create the contact with.
   * @returns A Promise that resolves with the created contact as ContactCreatedResponseDto.
   * @throws BadRequestException If the owner is not exactly one of retailer/recipient, or the owner already has a primary contact.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiBody({
    type: CreateContactDto,
    description: 'Data to create a new contact.',
  })
  @ApiCreatedResponse({
    description: 'The contact has been created successfully.',
    type: ContactCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data — owner is not exactly one of retailer/recipient, or the owner already has a primary contact.',
  })
  async create(
    @Body() createContactDto: CreateContactDto,
  ): Promise<ContactCreatedResponseDto> {
    return await this.contactsService.create(createContactDto);
  }

  /**
   * Updates a contact found by its ID.
   * @param id The ID of the contact to update.
   * @param updateContactDto The new data for the contact.
   * @returns A Promise that resolves with the updated contact as ContactCreatedResponseDto.
   * @throws NotFoundException If the contact is not found.
   * @throws BadRequestException If the resulting owner is not exactly one of retailer/recipient, or the owner already has a primary contact.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({
    name: 'id',
    description: 'ID of the contact to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateContactDto,
    description: 'New data for the contact.',
  })
  @ApiOkResponse({
    description: 'Contact updated successfully.',
    type: ContactCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Contact not found.' })
  @ApiBadRequestResponse({
    description:
      'Invalid data — owner is not exactly one of retailer/recipient, or the owner already has a primary contact.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContactDto: UpdateContactDto,
  ): Promise<ContactCreatedResponseDto> {
    return await this.contactsService.update(id, updateContactDto);
  }

  /**
   * Soft-deletes a contact.
   * @param id The ID of the contact to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the contact is not found.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact by its ID' })
  @ApiParam({ name: 'id', description: 'Contact ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Contact deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Contact not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.contactsService.remove(id);
  }
}
