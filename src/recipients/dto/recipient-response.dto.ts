import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProfileStatus } from '../../common/enums/profile-status.enum.js';
import type { Recipient } from '../entities/recipient.entity.js';
import { RecipientType } from '../enums/recipient-type.enum.js';

/** API representation of a recipient. */
export class RecipientResponseDto {
  @ApiProperty({ description: 'Unique recipient ID.', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'What kind of receiver this is.',
    enum: RecipientType,
    enumName: 'RecipientType',
    example: RecipientType.FOOD_BANK,
  })
  type: RecipientType;

  @ApiPropertyOptional({
    description: 'Registered organization name.',
    nullable: true,
  })
  legalName: string | null;

  @ApiProperty({
    description: "Public name of the organization, or the person's name.",
    example: 'Banco de Alimentos Paraguay',
  })
  displayName: string;

  @ApiPropertyOptional({ description: 'Abbreviated name.', nullable: true })
  shortName: string | null;

  @ApiPropertyOptional({
    description: 'Government tax identifier.',
    nullable: true,
  })
  taxId: string | null;

  @ApiPropertyOptional({ description: 'Mission statement.', nullable: true })
  mission: string | null;

  @ApiPropertyOptional({ description: 'Public website.', nullable: true })
  website: string | null;

  @ApiPropertyOptional({
    description: 'Absolute URL of the logo.',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiProperty({
    description: 'Lifecycle status.',
    enum: ProfileStatus,
    enumName: 'ProfileStatus',
    example: ProfileStatus.PENDING_VERIFICATION,
  })
  status: ProfileStatus;

  @ApiProperty({ description: 'Whether an admin has verified this recipient.' })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'When the recipient was verified (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  verifiedAt: string | null;

  @ApiPropertyOptional({
    description: 'ID of the admin who verified this recipient.',
    format: 'uuid',
    nullable: true,
  })
  verifiedById: string | null;

  @ApiPropertyOptional({
    description: 'Food-handling certification number.',
    nullable: true,
  })
  foodHandlingCertificationNumber: string | null;

  @ApiPropertyOptional({
    description: 'Certification expiry date.',
    type: String,
    format: 'date',
    nullable: true,
  })
  certificationExpiresAt: string | null;

  @ApiPropertyOptional({
    description: 'When the platform terms were accepted (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  termsAcceptedAt: string | null;

  @ApiPropertyOptional({
    description: 'Version of the terms accepted.',
    nullable: true,
  })
  termsVersion: string | null;

  @ApiProperty({
    description: 'When the recipient was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the recipient was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a Recipient entity onto its API representation.
   * @param data The Recipient entity loaded from the database.
   */
  constructor(data: Recipient) {
    this.id = data.id;
    this.type = data.type;
    this.legalName = data.legalName;
    this.displayName = data.displayName;
    this.shortName = data.shortName;
    this.taxId = data.taxId;
    this.mission = data.mission;
    this.website = data.website;
    this.logoUrl = data.logoUrl;
    this.status = data.status;
    this.isVerified = data.verifiedAt != null;
    this.verifiedAt = data.verifiedAt ? data.verifiedAt.toISOString() : null;
    this.verifiedById = data.verifiedById;
    this.foodHandlingCertificationNumber = data.foodHandlingCertificationNumber;
    this.certificationExpiresAt = data.certificationExpiresAt;
    this.termsAcceptedAt = data.termsAcceptedAt
      ? data.termsAcceptedAt.toISOString()
      : null;
    this.termsVersion = data.termsVersion;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
