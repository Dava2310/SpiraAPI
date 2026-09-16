import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import {
  CreateInvalidTokenDto,
  InvalidTokenCreatedResponseDto,
  InvalidTokenResponseDto,
  UpdateInvalidTokenDto,
} from './dto/index.js';
import { InvalidToken } from './entities/invalid-token.entity.js';

/**
 * Business logic for the InvalidToken entity — the JWT denylist. Implements
 * {@link CrudRepository} so the "find a valid record or throw" contract is the
 * same across modules.
 *
 * This table has no soft delete: removal is a real `DELETE`, because a
 * soft-deleted denylist entry would silently stop being found and the revoked
 * token would be accepted again.
 */
@Injectable()
export class InvalidTokensService implements CrudRepository<InvalidToken> {
  constructor(
    @InjectRepository(InvalidToken)
    private readonly invalidTokenRepository: Repository<InvalidToken>,
  ) {}

  /**
   * Finds an InvalidToken by its ID.
   * @param id The ID of the InvalidToken to look up.
   * @returns A Promise that resolves with the InvalidToken found.
   * @throws NotFoundException If the InvalidToken does not exist.
   */
  async findValid(id: number | string): Promise<InvalidToken> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid InvalidToken ID: ${id}`);
    }

    const invalidToken = await this.invalidTokenRepository.findOne({
      where: { id: uuid },
    });

    if (!invalidToken) {
      throw new NotFoundException(
        `InvalidToken with ID: ${id} not found or not valid`,
      );
    }

    return invalidToken;
  }

  /**
   * Retrieves every denylist entry.
   * @returns A Promise that resolves with all entries mapped to InvalidTokenResponseDto.
   */
  async findAll(): Promise<InvalidTokenResponseDto[]> {
    const invalidTokens = await this.invalidTokenRepository.find({
      order: { createdAt: 'DESC' },
    });

    return invalidTokens.map(
      (invalidToken) => new InvalidTokenResponseDto(invalidToken),
    );
  }

  /**
   * Retrieves a single denylist entry by its ID.
   * @param id The ID of the entry to look up.
   * @returns A Promise that resolves with the entry mapped to InvalidTokenResponseDto.
   * @throws NotFoundException If the entry is not found.
   */
  async findOne(id: string): Promise<InvalidTokenResponseDto> {
    const invalidToken = await this.findValid(id);

    return new InvalidTokenResponseDto(invalidToken);
  }

  /**
   * Finds a denylist entry by the token's `jti` claim. This is the lookup the
   * authentication path performs on every request.
   * @param jti The `jti` claim to search for.
   * @returns A Promise that resolves with the entry found, or null.
   */
  async findOneByJti(jti: string): Promise<InvalidToken | null> {
    return await this.invalidTokenRepository.findOne({ where: { jti } });
  }

  /**
   * Finds a denylist entry by `jti`, excluding one entry from the search by its ID.
   * @param id The ID of the entry to exclude from the search.
   * @param jti The `jti` claim to search for.
   * @returns A Promise that resolves with the entry found, or null.
   */
  async findOneByJtiNotId(
    id: string,
    jti: string,
  ): Promise<InvalidToken | null> {
    return await this.invalidTokenRepository.findOne({
      where: { jti, id: Not(id) },
    });
  }

  /**
   * Adds a token to the denylist.
   * @param createInvalidTokenDto The data to create the entry with.
   * @returns A Promise that resolves with the created entry and a success message.
   * @throws BadRequestException If the `jti` is already on the denylist.
   */
  async create(
    createInvalidTokenDto: CreateInvalidTokenDto,
  ): Promise<InvalidTokenCreatedResponseDto> {
    const { jti, userId, expiresAt, reason } = createInvalidTokenDto;

    if (await this.findOneByJti(jti)) {
      throw new BadRequestException(
        `The token with jti: ${jti} is already on the denylist`,
      );
    }

    const invalidToken = this.invalidTokenRepository.create({
      jti,
      userId,
      reason,
      expiresAt: new Date(expiresAt),
    });

    const newInvalidToken =
      await this.invalidTokenRepository.save(invalidToken);

    return new InvalidTokenCreatedResponseDto(
      newInvalidToken,
      'Token revoked successfully.',
    );
  }

  /**
   * Updates a denylist entry found by its ID.
   * @param id The ID of the entry to update.
   * @param updateInvalidTokenDto The new data for the entry.
   * @returns A Promise that resolves with the updated entry and a success message.
   * @throws NotFoundException If the entry is not found.
   * @throws BadRequestException If the `jti` is taken by another entry.
   */
  async update(
    id: string,
    updateInvalidTokenDto: UpdateInvalidTokenDto,
  ): Promise<InvalidTokenCreatedResponseDto> {
    const { jti, expiresAt, ...rest } = updateInvalidTokenDto;

    const invalidToken = await this.findValid(id);

    if (jti) {
      if (await this.findOneByJtiNotId(invalidToken.id, jti)) {
        throw new BadRequestException(
          `Another denylist entry already exists with the jti: ${jti}`,
        );
      }

      invalidToken.jti = jti;
    }

    Object.assign(invalidToken, rest);

    if (expiresAt) {
      invalidToken.expiresAt = new Date(expiresAt);
    }

    const updatedInvalidToken =
      await this.invalidTokenRepository.save(invalidToken);

    return new InvalidTokenCreatedResponseDto(
      updatedInvalidToken,
      'Denylist entry updated successfully.',
    );
  }

  /**
   * Permanently deletes a denylist entry, lifting the revocation. There is no
   * soft delete here by design.
   * @param id The ID of the entry to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the entry is not found.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const invalidToken = await this.findValid(id);

    await this.invalidTokenRepository.remove(invalidToken);

    return new MessageResponseDto('Denylist entry deleted successfully.');
  }

  /**
   * Deletes entries whose token has already expired. Safe because ordinary JWT
   * validation rejects an expired token anyway, so the row is dead weight
   * rather than a security control.
   * @returns A Promise that resolves with how many entries were purged.
   */
  async purgeExpired(): Promise<MessageResponseDto> {
    const { affected } = await this.invalidTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return new MessageResponseDto(
      `Purged ${affected ?? 0} expired denylist entries.`,
    );
  }
}
