import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import {
  CreateRecipientDto,
  RecipientCreatedResponseDto,
  RecipientResponseDto,
  UpdateRecipientDto,
} from './dto/index.js';
import { Recipient } from './entities/recipient.entity.js';

/**
 * Business logic for the Recipient entity. Implements {@link CrudRepository} so
 * the "find a valid record or throw" contract is the same across modules.
 */
@Injectable()
export class RecipientsService implements CrudRepository<Recipient> {
  constructor(
    @InjectRepository(Recipient)
    private readonly recipientRepository: Repository<Recipient>,
  ) {}

  /**
   * Finds a Recipient by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the Recipient to look up.
   * @returns A Promise that resolves with the Recipient found.
   * @throws NotFoundException If the Recipient does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<Recipient> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid Recipient ID: ${id}`);
    }

    const recipient = await this.recipientRepository.findOne({
      where: { id: uuid },
    });

    if (!recipient) {
      throw new NotFoundException(
        `Recipient with ID: ${id} not found or not valid`,
      );
    }

    return recipient;
  }

  /**
   * Retrieves every recipient that is not soft-deleted.
   * @returns A Promise that resolves with all recipients mapped to RecipientResponseDto.
   */
  async findAll(): Promise<RecipientResponseDto[]> {
    const recipients = await this.recipientRepository.find({
      order: { createdAt: 'DESC' },
    });

    return recipients.map((recipient) => new RecipientResponseDto(recipient));
  }

  /**
   * Retrieves a single recipient by its ID.
   * @param id The ID of the recipient to look up.
   * @returns A Promise that resolves with the recipient mapped to RecipientResponseDto.
   * @throws NotFoundException If the recipient is not found.
   */
  async findOne(id: string): Promise<RecipientResponseDto> {
    const recipient = await this.findValid(id);

    return new RecipientResponseDto(recipient);
  }

  /**
   * Finds a recipient by tax ID.
   * @param taxId The tax ID to search for.
   * @returns A Promise that resolves with the recipient found, or null.
   */
  async findOneByTaxId(taxId: string): Promise<Recipient | null> {
    return await this.recipientRepository.findOne({ where: { taxId } });
  }

  /**
   * Finds a recipient with the given tax ID, excluding one recipient from the search
   * by its ID.
   * @param id The ID of the recipient to exclude from the search.
   * @param taxId The tax ID to search for.
   * @returns A Promise that resolves with the recipient found, or null.
   */
  async findOneByTaxIdNotId(
    id: string,
    taxId: string,
  ): Promise<Recipient | null> {
    return await this.recipientRepository.findOne({
      where: { taxId, id: Not(id) },
    });
  }

  /**
   * Creates a recipient.
   * @param createRecipientDto The data to create the recipient with.
   * @returns A Promise that resolves with the created recipient and a success message.
   * @throws BadRequestException If the tax ID is already taken.
   */
  async create(
    createRecipientDto: CreateRecipientDto,
  ): Promise<RecipientCreatedResponseDto> {
    const { taxId, termsAcceptedAt } = createRecipientDto;

    if (taxId && (await this.findOneByTaxId(taxId))) {
      throw new BadRequestException(
        `A recipient already exists with the tax ID: ${taxId}`,
      );
    }

    const recipient = this.recipientRepository.create({
      ...createRecipientDto,
      termsAcceptedAt: termsAcceptedAt ? new Date(termsAcceptedAt) : null,
    });

    const newRecipient = await this.recipientRepository.save(recipient);

    return new RecipientCreatedResponseDto(
      newRecipient,
      'Recipient created successfully.',
    );
  }

  /**
   * Updates a recipient found by its ID.
   * @param id The ID of the recipient to update.
   * @param updateRecipientDto The new data for the recipient.
   * @returns A Promise that resolves with the updated recipient and a success message.
   * @throws NotFoundException If the recipient is not found.
   * @throws BadRequestException If the tax ID is taken by another recipient.
   */
  async update(
    id: string,
    updateRecipientDto: UpdateRecipientDto,
  ): Promise<RecipientCreatedResponseDto> {
    const { taxId, termsAcceptedAt, ...rest } = updateRecipientDto;

    const recipient = await this.findValid(id);

    if (taxId && (await this.findOneByTaxIdNotId(recipient.id, taxId))) {
      throw new BadRequestException(
        `Another recipient is already registered with the tax ID: ${taxId}`,
      );
    }

    Object.assign(recipient, rest);

    if (taxId !== undefined) {
      recipient.taxId = taxId;
    }

    if (termsAcceptedAt !== undefined) {
      recipient.termsAcceptedAt = termsAcceptedAt
        ? new Date(termsAcceptedAt)
        : null;
    }

    const updatedRecipient = await this.recipientRepository.save(recipient);

    return new RecipientCreatedResponseDto(
      updatedRecipient,
      'Recipient updated successfully.',
    );
  }

  /**
   * Soft-deletes a recipient, so the row is kept for historical records and its
   * tax ID can be reused.
   * @param id The ID of the recipient to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the recipient is not found.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const recipient = await this.findValid(id);

    await this.recipientRepository.softRemove(recipient);

    return new MessageResponseDto('Recipient deleted successfully.');
  }
}
