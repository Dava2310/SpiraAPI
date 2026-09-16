import { ApiProperty } from '@nestjs/swagger';

import type { InvalidToken } from '../entities/invalid-token.entity.js';
import { InvalidTokenReason } from '../enums/invalid-token-reason.enum.js';

/** API representation of a denylist entry. */
export class InvalidTokenResponseDto {
  @ApiProperty({ description: 'Unique denylist entry ID.', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: "The revoked token's `jti` claim.",
    format: 'uuid',
  })
  jti: string;

  @ApiProperty({ description: 'Owner of the revoked token.', format: 'uuid' })
  userId: string;

  @ApiProperty({
    description: 'When the token naturally expires (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Why the token was revoked.',
    enum: InvalidTokenReason,
    enumName: 'InvalidTokenReason',
    example: InvalidTokenReason.LOGOUT,
  })
  reason: InvalidTokenReason;

  @ApiProperty({
    description: 'Whether the token is already past its expiry.',
    example: false,
  })
  isExpired: boolean;

  @ApiProperty({
    description: 'When the token was invalidated (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the entry was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps an InvalidToken entity onto its API representation.
   * @param data The InvalidToken entity loaded from the database.
   */
  constructor(data: InvalidToken) {
    this.id = data.id;
    this.jti = data.jti;
    this.userId = data.userId;
    this.expiresAt = data.expiresAt.toISOString();
    this.reason = data.reason;
    this.isExpired = data.expiresAt.getTime() < Date.now();
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
