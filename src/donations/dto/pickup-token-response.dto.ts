import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { PickupToken } from '../entities/pickup-token.entity.js';

/** API representation of a pickup token, which the recipient app renders as a QR code. */
export class PickupTokenResponseDto {
  @ApiProperty({ description: 'Unique token ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Donation this token releases.', format: 'uuid' })
  donationId: string;

  @ApiProperty({
    description: 'What the QR code encodes.',
    example: 'PT-7F3A9C2E4B',
  })
  code: string;

  @ApiProperty({
    description: 'When the token stops being accepted (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Whether the token can still be used.',
    example: true,
  })
  isUsable: boolean;

  @ApiPropertyOptional({
    description: 'When it was scanned (ISO 8601). Null means unused.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  consumedAt: string | null;

  @ApiProperty({
    description: 'When the token was issued (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  /**
   * Maps a PickupToken entity onto its API representation.
   * @param data The PickupToken entity loaded from the database.
   */
  constructor(data: PickupToken) {
    this.id = data.id;
    this.donationId = data.donationId;
    this.code = data.code;
    this.expiresAt = data.expiresAt.toISOString();
    this.isUsable =
      data.consumedAt === null && data.expiresAt.getTime() > Date.now();
    this.consumedAt = data.consumedAt ? data.consumedAt.toISOString() : null;
    this.createdAt = data.createdAt.toISOString();
  }
}
