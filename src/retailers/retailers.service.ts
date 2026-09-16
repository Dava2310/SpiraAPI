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
  CreateRetailerDto,
  RetailerCreatedResponseDto,
  RetailerResponseDto,
  UpdateRetailerDto,
} from './dto/index.js';
import { Retailer } from './entities/retailer.entity.js';

/**
 * Business logic for the Retailer entity. Implements {@link CrudRepository} so
 * the "find a valid record or throw" contract is the same across modules.
 */
@Injectable()
export class RetailersService implements CrudRepository<Retailer> {
  constructor(
    @InjectRepository(Retailer)
    private readonly retailerRepository: Repository<Retailer>,
  ) {}

  /**
   * Finds a Retailer by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the Retailer to look up.
   * @returns A Promise that resolves with the Retailer found.
   * @throws NotFoundException If the Retailer does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<Retailer> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid Retailer ID: ${id}`);
    }

    const retailer = await this.retailerRepository.findOne({
      where: { id: uuid },
    });

    if (!retailer) {
      throw new NotFoundException(
        `Retailer with ID: ${id} not found or not valid`,
      );
    }

    return retailer;
  }

  /**
   * Retrieves every retailer that is not soft-deleted.
   * @returns A Promise that resolves with all retailers mapped to RetailerResponseDto.
   */
  async findAll(): Promise<RetailerResponseDto[]> {
    const retailers = await this.retailerRepository.find({
      order: { createdAt: 'DESC' },
    });

    return retailers.map((retailer) => new RetailerResponseDto(retailer));
  }

  /**
   * Retrieves a single retailer by its ID.
   * @param id The ID of the retailer to look up.
   * @returns A Promise that resolves with the retailer mapped to RetailerResponseDto.
   * @throws NotFoundException If the retailer is not found.
   */
  async findOne(id: string): Promise<RetailerResponseDto> {
    const retailer = await this.findValid(id);

    return new RetailerResponseDto(retailer);
  }

  /**
   * Finds a retailer by slug.
   * @param slug The slug to search for.
   * @returns A Promise that resolves with the retailer found, or null.
   */
  async findOneBySlug(slug: string): Promise<Retailer | null> {
    return await this.retailerRepository.findOne({ where: { slug } });
  }

  /**
   * Finds a retailer by tax ID.
   * @param taxId The tax ID to search for.
   * @returns A Promise that resolves with the retailer found, or null.
   */
  async findOneByTaxId(taxId: string): Promise<Retailer | null> {
    return await this.retailerRepository.findOne({ where: { taxId } });
  }

  /**
   * Finds a retailer holding either the given slug or tax ID, excluding one
   * retailer from the search by its ID.
   * @param id The ID of the retailer to exclude from the search.
   * @param slug The slug to search for, if any.
   * @param taxId The tax ID to search for, if any.
   * @returns A Promise that resolves with the retailer found, or null.
   */
  async findDuplicatedExcludingId(
    id: string,
    slug?: string,
    taxId?: string,
  ): Promise<Retailer | null> {
    const where = [
      ...(slug ? [{ slug, id: Not(id) }] : []),
      ...(taxId ? [{ taxId, id: Not(id) }] : []),
    ];

    if (where.length === 0) {
      return null;
    }

    return await this.retailerRepository.findOne({ where });
  }

  /**
   * Creates a retailer.
   * @param createRetailerDto The data to create the retailer with.
   * @returns A Promise that resolves with the created retailer and a success message.
   * @throws BadRequestException If the slug or the tax ID is already taken.
   */
  async create(
    createRetailerDto: CreateRetailerDto,
  ): Promise<RetailerCreatedResponseDto> {
    const { slug, taxId, termsAcceptedAt } = createRetailerDto;

    if (await this.findOneBySlug(slug)) {
      throw new BadRequestException(
        `A retailer already exists with the slug: ${slug}`,
      );
    }

    if (await this.findOneByTaxId(taxId)) {
      throw new BadRequestException(
        `A retailer already exists with the tax ID: ${taxId}`,
      );
    }

    const retailer = this.retailerRepository.create({
      ...createRetailerDto,
      termsAcceptedAt: termsAcceptedAt ? new Date(termsAcceptedAt) : null,
    });

    const newRetailer = await this.retailerRepository.save(retailer);

    return new RetailerCreatedResponseDto(
      newRetailer,
      'Retailer created successfully.',
    );
  }

  /**
   * Updates a retailer found by its ID.
   * @param id The ID of the retailer to update.
   * @param updateRetailerDto The new data for the retailer.
   * @returns A Promise that resolves with the updated retailer and a success message.
   * @throws NotFoundException If the retailer is not found.
   * @throws BadRequestException If the slug or the tax ID is taken by another retailer.
   */
  async update(
    id: string,
    updateRetailerDto: UpdateRetailerDto,
  ): Promise<RetailerCreatedResponseDto> {
    const { slug, taxId, termsAcceptedAt, ...rest } = updateRetailerDto;

    const retailer = await this.findValid(id);

    if (slug || taxId) {
      const duplicated = await this.findDuplicatedExcludingId(
        retailer.id,
        slug,
        taxId,
      );

      if (duplicated) {
        if (slug && duplicated.slug === slug) {
          throw new BadRequestException(
            `Another retailer is already registered with the slug: ${slug}`,
          );
        }

        throw new BadRequestException(
          `Another retailer is already registered with the tax ID: ${taxId}`,
        );
      }
    }

    Object.assign(retailer, rest);

    if (slug) {
      retailer.slug = slug;
    }

    if (taxId) {
      retailer.taxId = taxId;
    }

    if (termsAcceptedAt !== undefined) {
      retailer.termsAcceptedAt = termsAcceptedAt
        ? new Date(termsAcceptedAt)
        : null;
    }

    const updatedRetailer = await this.retailerRepository.save(retailer);

    return new RetailerCreatedResponseDto(
      updatedRetailer,
      'Retailer updated successfully.',
    );
  }

  /**
   * Soft-deletes a retailer, so the row is kept for historical records and its
   * slug and tax ID can be reused.
   * @param id The ID of the retailer to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the retailer is not found.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const retailer = await this.findValid(id);

    await this.retailerRepository.softRemove(retailer);

    return new MessageResponseDto('Retailer deleted successfully.');
  }
}
