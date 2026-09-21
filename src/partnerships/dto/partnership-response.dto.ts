import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Partnership } from '../entities/partnership.entity.js';
import { PartnershipStatus } from '../enums/partnership-status.enum.js';

/** API representation of a retailer-recipient partnership. */
export class PartnershipResponseDto {
  @ApiProperty({ description: 'Unique partnership ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Retailer side.', format: 'uuid' })
  retailerId: string;

  @ApiProperty({ description: 'Recipient side.', format: 'uuid' })
  recipientId: string;

  @ApiProperty({
    description: 'State of the relationship.',
    enum: PartnershipStatus,
    enumName: 'PartnershipStatus',
    example: PartnershipStatus.ACTIVE,
  })
  status: PartnershipStatus;

  @ApiProperty({ description: 'Whether this is the default recipient.' })
  isPreferred: boolean;

  @ApiPropertyOptional({
    description: 'When the partnership began (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  startedAt: string | null;

  @ApiProperty({
    description: 'When the partnership was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the partnership was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a Partnership entity onto its API representation.
   * @param data The Partnership entity loaded from the database.
   */
  constructor(data: Partnership) {
    this.id = data.id;
    this.retailerId = data.retailerId;
    this.recipientId = data.recipientId;
    this.status = data.status;
    this.isPreferred = data.isPreferred;
    this.startedAt = data.startedAt ? data.startedAt.toISOString() : null;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
