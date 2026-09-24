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
import type { AuthenticatedUser } from '../common/interfaces/index.js';
import {
  assertCanCreateFor,
  assertOwn,
  ownScopeWhere,
} from '../common/scoping/org-scope.js';
import {
  CreatePartnershipDto,
  PartnershipCreatedResponseDto,
  PartnershipResponseDto,
  UpdatePartnershipDto,
} from './dto/index.js';
import { Partnership } from './entities/partnership.entity.js';
import { PartnershipStatus } from './enums/partnership-status.enum.js';

/**
 * Business logic for retailer-recipient partnerships — the list a manager picks
 * from when offering a donation. Implements {@link CrudRepository} so the "find a
 * valid record or throw" contract is the same across modules.
 */
@Injectable()
export class PartnershipsService implements CrudRepository<Partnership> {
  constructor(
    @InjectRepository(Partnership)
    private readonly partnershipRepository: Repository<Partnership>,
  ) {}

  /**
   * Finds a Partnership by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the partnership to look up.
   * @returns A Promise that resolves with the partnership found.
   * @throws NotFoundException If it does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<Partnership> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid Partnership ID: ${id}`);
    }

    const partnership = await this.partnershipRepository.findOne({
      where: { id: uuid },
    });

    if (!partnership) {
      throw new NotFoundException(
        `Partnership with ID: ${id} not found or not valid`,
      );
    }

    return partnership;
  }

  /**
   * Retrieves every partnership that is not soft-deleted.
   * @returns A Promise that resolves with all partnerships mapped to PartnershipResponseDto.
   */
  async findAll(caller: AuthenticatedUser): Promise<PartnershipResponseDto[]> {
    const partnerships = await this.partnershipRepository.find({
      where: ownScopeWhere(caller, { retailer: "retailerId", recipient: "recipientId" }) ?? undefined,
      order: { createdAt: 'DESC' },
    });

    return partnerships.map(
      (partnership) => new PartnershipResponseDto(partnership),
    );
  }

  /**
   * Retrieves a single partnership by its ID.
   * @param id The ID of the partnership to look up.
   * @returns A Promise that resolves with the partnership mapped to PartnershipResponseDto.
   * @throws NotFoundException If the partnership is not found.
   */
  async findOne(id: string, caller: AuthenticatedUser): Promise<PartnershipResponseDto> {
    const partnership = await this.findValid(id);

    assertOwn(caller, partnership, 'Partnership');

    return new PartnershipResponseDto(partnership);
  }

  /**
   * Retrieves one retailer's partner list, preferred partner first.
   * @param retailerId The ID of the retailer.
   * @returns A Promise that resolves with the partnerships mapped to PartnershipResponseDto.
   */
  async findAllByRetailer(
    retailerId: string,
  ): Promise<PartnershipResponseDto[]> {
    const partnerships = await this.partnershipRepository.find({
      where: { retailerId },
      order: { isPreferred: 'DESC', createdAt: 'DESC' },
    });

    return partnerships.map(
      (partnership) => new PartnershipResponseDto(partnership),
    );
  }

  /**
   * Finds the partnership joining one retailer to one recipient.
   * @param retailerId The retailer side.
   * @param recipientId The recipient side.
   * @returns A Promise that resolves with the partnership found, or null.
   */
  async findOneByPair(
    retailerId: string,
    recipientId: string,
  ): Promise<Partnership | null> {
    return await this.partnershipRepository.findOne({
      where: { retailerId, recipientId },
    });
  }

  /**
   * Pairs a retailer with a recipient.
   * @param createPartnershipDto The two sides and the initial state.
   * @returns A Promise that resolves with the created partnership and a success message.
   * @throws BadRequestException If the two are already partnered.
   */
  async create(
    createPartnershipDto: CreatePartnershipDto,
    caller: AuthenticatedUser,
  ): Promise<PartnershipCreatedResponseDto> {
    assertCanCreateFor(caller, createPartnershipDto);

    const { retailerId, recipientId, isPreferred, startedAt } =
      createPartnershipDto;

    if (await this.findOneByPair(retailerId, recipientId)) {
      throw new BadRequestException(
        'These two organizations are already partnered.',
      );
    }

    const partnership = this.partnershipRepository.create({
      ...createPartnershipDto,
      startedAt: startedAt ? new Date(startedAt) : null,
    });

    const newPartnership = await this.partnershipRepository.save(partnership);

    if (isPreferred) {
      await this.clearOtherPreferred(retailerId, newPartnership.id);
    }

    return new PartnershipCreatedResponseDto(
      newPartnership,
      'Partnership created successfully.',
    );
  }

  /**
   * Updates a partnership found by its ID.
   * @param id The ID of the partnership to update.
   * @param updatePartnershipDto The new state of the relationship.
   * @returns A Promise that resolves with the updated partnership and a success message.
   * @throws NotFoundException If the partnership is not found.
   * @throws BadRequestException If the change would duplicate an existing pair.
   */
  async update(
    id: string,
    updatePartnershipDto: UpdatePartnershipDto,
    caller: AuthenticatedUser,
  ): Promise<PartnershipCreatedResponseDto> {
    const partnership = await this.findValid(id);

    assertOwn(caller, partnership, 'Partnership');
    const { retailerId, recipientId, isPreferred, startedAt, ...rest } =
      updatePartnershipDto;

    const nextRetailerId = retailerId ?? partnership.retailerId;
    const nextRecipientId = recipientId ?? partnership.recipientId;

    if (
      (retailerId || recipientId) &&
      (await this.partnershipRepository.findOne({
        where: {
          retailerId: nextRetailerId,
          recipientId: nextRecipientId,
          id: Not(partnership.id),
        },
      }))
    ) {
      throw new BadRequestException(
        'These two organizations are already partnered.',
      );
    }

    Object.assign(partnership, rest);
    partnership.retailerId = nextRetailerId;
    partnership.recipientId = nextRecipientId;

    if (isPreferred !== undefined) {
      partnership.isPreferred = isPreferred;
    }

    if (startedAt !== undefined) {
      partnership.startedAt = startedAt ? new Date(startedAt) : null;
    }

    const updatedPartnership =
      await this.partnershipRepository.save(partnership);

    if (updatedPartnership.isPreferred) {
      await this.clearOtherPreferred(
        updatedPartnership.retailerId,
        updatedPartnership.id,
      );
    }

    return new PartnershipCreatedResponseDto(
      updatedPartnership,
      'Partnership updated successfully.',
    );
  }

  /**
   * Soft-deletes a partnership. Setting the status to `ENDED` is usually better,
   * because it keeps the history of who a retailer used to work with.
   * @param id The ID of the partnership to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the partnership is not found.
   */
  async remove(
    id: string,
    caller: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    const partnership = await this.findValid(id);

    assertOwn(caller, partnership, 'Partnership');

    await this.partnershipRepository.softRemove(partnership);

    return new MessageResponseDto('Partnership deleted successfully.');
  }

  /**
   * Finds the partner a retailer offers to when a manager does not choose.
   * @param retailerId The ID of the retailer.
   * @returns A Promise that resolves with the preferred active partnership, or null.
   */
  async findPreferredForRetailer(
    retailerId: string,
  ): Promise<Partnership | null> {
    return await this.partnershipRepository.findOne({
      where: {
        retailerId,
        isPreferred: true,
        status: PartnershipStatus.ACTIVE,
      },
    });
  }

  /**
   * Demotes every other partnership of a retailer, so at most one is preferred.
   * @param retailerId The ID of the retailer.
   * @param keepId The partnership that stays preferred.
   * @returns A Promise that resolves once the others are demoted.
   */
  private async clearOtherPreferred(
    retailerId: string,
    keepId: string,
  ): Promise<void> {
    await this.partnershipRepository.update(
      { retailerId, isPreferred: true, id: Not(keepId) },
      { isPreferred: false },
    );
  }
}
