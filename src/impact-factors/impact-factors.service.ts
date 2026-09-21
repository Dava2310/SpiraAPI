import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import {
  CreateImpactFactorDto,
  ImpactFactorCreatedResponseDto,
  ImpactFactorResponseDto,
  UpdateImpactFactorDto,
} from './dto/index.js';
import { ImpactFactor } from './entities/impact-factor.entity.js';

/**
 * Business logic for the impact conversion factors certificates are priced with.
 * Implements {@link CrudRepository} so the "find a valid record or throw"
 * contract is the same across modules.
 */
@Injectable()
export class ImpactFactorsService implements CrudRepository<ImpactFactor> {
  constructor(
    @InjectRepository(ImpactFactor)
    private readonly impactFactorRepository: Repository<ImpactFactor>,
  ) {}

  /**
   * Finds an ImpactFactor by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the factor set to look up.
   * @returns A Promise that resolves with the factor set found.
   * @throws NotFoundException If it does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<ImpactFactor> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid ImpactFactor ID: ${id}`);
    }

    const impactFactor = await this.impactFactorRepository.findOne({
      where: { id: uuid },
    });

    if (!impactFactor) {
      throw new NotFoundException(
        `ImpactFactor with ID: ${id} not found or not valid`,
      );
    }

    return impactFactor;
  }

  /**
   * Retrieves every factor set, newest effective period first.
   * @returns A Promise that resolves with all sets mapped to ImpactFactorResponseDto.
   */
  async findAll(): Promise<ImpactFactorResponseDto[]> {
    const impactFactors = await this.impactFactorRepository.find({
      order: { effectiveFrom: 'DESC' },
    });

    return impactFactors.map(
      (impactFactor) => new ImpactFactorResponseDto(impactFactor),
    );
  }

  /**
   * Retrieves a single factor set by its ID.
   * @param id The ID of the factor set to look up.
   * @returns A Promise that resolves with the set mapped to ImpactFactorResponseDto.
   * @throws NotFoundException If the set is not found.
   */
  async findOne(id: string): Promise<ImpactFactorResponseDto> {
    const impactFactor = await this.findValid(id);

    return new ImpactFactorResponseDto(impactFactor);
  }

  /**
   * Finds the factor set in force on a given day. This is what a certificate
   * uses, so the figures it states can be reproduced later.
   * @param on The day to resolve, as `YYYY-MM-DD`. Defaults to today.
   * @returns A Promise that resolves with the effective set, or null if none covers that day.
   */
  async findEffectiveOn(on?: string): Promise<ImpactFactor | null> {
    const day = on ?? new Date().toISOString().slice(0, 10);

    return await this.impactFactorRepository.findOne({
      where: [
        { effectiveFrom: LessThanOrEqual(day), effectiveTo: IsNull() },
        {
          effectiveFrom: LessThanOrEqual(day),
          effectiveTo: MoreThanOrEqual(day),
        },
      ],
      order: { effectiveFrom: 'DESC' },
    });
  }

  /**
   * Publishes a set of factors.
   * @param createImpactFactorDto The factors and the period they apply to.
   * @returns A Promise that resolves with the created set and a success message.
   * @throws BadRequestException If the period is inverted or overlaps an existing set.
   */
  async create(
    createImpactFactorDto: CreateImpactFactorDto,
  ): Promise<ImpactFactorCreatedResponseDto> {
    const { effectiveFrom, effectiveTo } = createImpactFactorDto;

    this.assertPeriodOrdered(effectiveFrom, effectiveTo ?? null);
    await this.assertNoOverlap(effectiveFrom, effectiveTo ?? null);

    const impactFactor = this.impactFactorRepository.create(
      createImpactFactorDto,
    );
    const newImpactFactor =
      await this.impactFactorRepository.save(impactFactor);

    return new ImpactFactorCreatedResponseDto(
      newImpactFactor,
      'Impact factors created successfully.',
    );
  }

  /**
   * Updates a factor set found by its ID.
   * @param id The ID of the set to update.
   * @param updateImpactFactorDto The new factors or period.
   * @returns A Promise that resolves with the updated set and a success message.
   * @throws NotFoundException If the set is not found.
   * @throws BadRequestException If the period is inverted or overlaps another set.
   */
  async update(
    id: string,
    updateImpactFactorDto: UpdateImpactFactorDto,
  ): Promise<ImpactFactorCreatedResponseDto> {
    const impactFactor = await this.findValid(id);
    const { effectiveTo, ...rest } = updateImpactFactorDto;

    Object.assign(impactFactor, rest);

    if (effectiveTo !== undefined) {
      impactFactor.effectiveTo = effectiveTo ?? null;
    }

    this.assertPeriodOrdered(
      impactFactor.effectiveFrom,
      impactFactor.effectiveTo,
    );
    await this.assertNoOverlap(
      impactFactor.effectiveFrom,
      impactFactor.effectiveTo,
      impactFactor.id,
    );

    const updatedImpactFactor =
      await this.impactFactorRepository.save(impactFactor);

    return new ImpactFactorCreatedResponseDto(
      updatedImpactFactor,
      'Impact factors updated successfully.',
    );
  }

  /**
   * Soft-deletes a factor set. Certificates already issued keep pointing at it,
   * so the figures they state stay explainable.
   * @param id The ID of the set to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the set is not found.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const impactFactor = await this.findValid(id);

    await this.impactFactorRepository.softRemove(impactFactor);

    return new MessageResponseDto('Impact factors deleted successfully.');
  }

  /**
   * Rejects a period that ends before it starts.
   * @param from First day the factors apply.
   * @param to Last day they apply, or null while current.
   * @throws BadRequestException If `to` precedes `from`.
   */
  private assertPeriodOrdered(from: string, to: string | null): void {
    if (to && to < from) {
      throw new BadRequestException(
        'The effective-to date cannot precede the effective-from date.',
      );
    }
  }

  /**
   * Rejects a period that overlaps another set, so `findEffectiveOn` always has
   * exactly one answer.
   * @param from First day the factors apply.
   * @param to Last day they apply, or null while current.
   * @param excludeId A set to ignore, used when updating that set.
   * @throws BadRequestException If another set covers any of the same days.
   */
  private async assertNoOverlap(
    from: string,
    to: string | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.impactFactorRepository.find({
      where: excludeId ? { id: Not(excludeId) } : {},
    });

    const clash = existing.find(
      (other) =>
        (to === null || other.effectiveFrom <= to) &&
        (other.effectiveTo === null || other.effectiveTo >= from),
    );

    if (clash) {
      throw new BadRequestException(
        `The effective period overlaps the existing set: ${clash.label}`,
      );
    }
  }
}
