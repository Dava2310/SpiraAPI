import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { assertSingleOwner, UUID_PATTERN } from '../common/validation/index.js';
import {
  ContactCreatedResponseDto,
  ContactResponseDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/index.js';
import { Contact } from './entities/contact.entity.js';

/**
 * Business logic for the Contact entity. Implements {@link CrudRepository} so
 * the "find a valid record or throw" contract is the same across modules.
 */
@Injectable()
export class ContactsService implements CrudRepository<Contact> {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  /**
   * Finds a Contact by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the Contact to look up.
   * @returns A Promise that resolves with the Contact found.
   * @throws NotFoundException If the Contact does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<Contact> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid Contact ID: ${id}`);
    }

    const contact = await this.contactRepository.findOne({
      where: { id: uuid },
    });

    if (!contact) {
      throw new NotFoundException(
        `Contact with ID: ${id} not found or not valid`,
      );
    }

    return contact;
  }

  /**
   * Retrieves every contact that is not soft-deleted.
   * @returns A Promise that resolves with all contacts mapped to ContactResponseDto.
   */
  async findAll(): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.find({
      order: { createdAt: 'DESC' },
    });

    return contacts.map((contact) => new ContactResponseDto(contact));
  }

  /**
   * Retrieves a single contact by its ID.
   * @param id The ID of the contact to look up.
   * @returns A Promise that resolves with the contact mapped to ContactResponseDto.
   * @throws NotFoundException If the contact is not found.
   */
  async findOne(id: string): Promise<ContactResponseDto> {
    const contact = await this.findValid(id);

    return new ContactResponseDto(contact);
  }

  /**
   * Retrieves every contact belonging to a retailer.
   * @param retailerId The ID of the owning retailer.
   * @returns A Promise that resolves with the contacts mapped to ContactResponseDto.
   */
  async findAllByRetailer(retailerId: string): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.find({
      where: { retailerId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });

    return contacts.map((contact) => new ContactResponseDto(contact));
  }

  /**
   * Retrieves every contact belonging to a recipient.
   * @param recipientId The ID of the owning recipient.
   * @returns A Promise that resolves with the contacts mapped to ContactResponseDto.
   */
  async findAllByRecipient(recipientId: string): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.find({
      where: { recipientId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });

    return contacts.map((contact) => new ContactResponseDto(contact));
  }

  /**
   * Creates a contact.
   * @param createContactDto The data to create the contact with.
   * @returns A Promise that resolves with the created contact and a success message.
   * @throws BadRequestException If the owner is not exactly one of retailer or
   * recipient, or the owner already has a primary contact.
   */
  async create(
    createContactDto: CreateContactDto,
  ): Promise<ContactCreatedResponseDto> {
    const { retailerId, recipientId, isPrimary } = createContactDto;

    assertSingleOwner('contact', retailerId, recipientId);

    if (isPrimary) {
      await this.assertNoOtherPrimary(retailerId, recipientId);
    }

    const contact = this.contactRepository.create({
      ...createContactDto,
      retailerId: retailerId ?? null,
      recipientId: recipientId ?? null,
    });

    const newContact = await this.contactRepository.save(contact);

    return new ContactCreatedResponseDto(
      newContact,
      'Contact created successfully.',
    );
  }

  /**
   * Updates a contact found by its ID.
   * @param id The ID of the contact to update.
   * @param updateContactDto The new data for the contact.
   * @returns A Promise that resolves with the updated contact and a success message.
   * @throws NotFoundException If the contact is not found.
   * @throws BadRequestException If the resulting owner is not exactly one of
   * retailer or recipient, or the owner already has another primary contact.
   */
  async update(
    id: string,
    updateContactDto: UpdateContactDto,
  ): Promise<ContactCreatedResponseDto> {
    const { retailerId, recipientId, ...rest } = updateContactDto;

    const contact = await this.findValid(id);

    Object.assign(contact, rest);

    if (retailerId !== undefined) {
      contact.retailerId = retailerId;
    }

    if (recipientId !== undefined) {
      contact.recipientId = recipientId;
    }

    assertSingleOwner('contact', contact.retailerId, contact.recipientId);

    if (contact.isPrimary) {
      await this.assertNoOtherPrimary(
        contact.retailerId,
        contact.recipientId,
        contact.id,
      );
    }

    const updatedContact = await this.contactRepository.save(contact);

    return new ContactCreatedResponseDto(
      updatedContact,
      'Contact updated successfully.',
    );
  }

  /**
   * Soft-deletes a contact.
   * @param id The ID of the contact to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the contact is not found.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const contact = await this.findValid(id);

    await this.contactRepository.softRemove(contact);

    return new MessageResponseDto('Contact deleted successfully.');
  }

  /**
   * Checks the partial unique index that allows only one primary contact per
   * owner, so a violation surfaces as a 400 rather than a driver error.
   * @param retailerId The owning retailer, if any.
   * @param recipientId The owning recipient, if any.
   * @param excludeId A contact to ignore, used when updating that contact.
   * @throws BadRequestException If the owner already has a primary contact.
   */
  private async assertNoOtherPrimary(
    retailerId?: string | null,
    recipientId?: string | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.contactRepository.findOne({
      where: {
        isPrimary: true,
        retailerId: retailerId ?? IsNull(),
        recipientId: recipientId ?? IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'This owner already has a primary contact. Clear the existing one first.',
      );
    }
  }
}
