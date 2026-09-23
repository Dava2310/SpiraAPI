import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProfileStatus } from '../../common/enums/profile-status.enum.js';
import type { Recipient } from '../entities/recipient.entity.js';
import { RecipientType } from '../enums/recipient-type.enum.js';
import { UrgencyThreshold } from '../enums/urgency-threshold.enum.js';

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
    type: String,
    description: 'Registered organization name.',
    nullable: true,
  })
  legalName: string | null;

  @ApiProperty({
    description: "Public name of the organization, or the person's name.",
    example: 'Banco de Alimentos Paraguay',
  })
  displayName: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Abbreviated name.',
    nullable: true,
  })
  shortName: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Government tax identifier.',
    nullable: true,
  })
  taxId: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Charity or non-profit registration number.',
    nullable: true,
    example: 'G-12345678',
  })
  registrationCode: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Mission statement.',
    nullable: true,
  })
  mission: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Where they operate, as they describe it.',
    nullable: true,
    example: 'Metropolitan Barcelona',
  })
  serviceArea: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Public website.',
    nullable: true,
  })
  website: string | null;

  @ApiPropertyOptional({
    type: String,
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
    type: String,
    description: 'ID of the admin who verified this recipient.',
    format: 'uuid',
    nullable: true,
  })
  verifiedById: string | null;

  @ApiPropertyOptional({
    type: String,
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
    type: String,
    description: 'Version of the terms accepted.',
    nullable: true,
  })
  termsVersion: string | null;

  @ApiProperty({
    description: 'IANA timezone the organization works in.',
    example: 'Europe/Madrid',
  })
  timezone: string;

  @ApiProperty({
    description: 'How far they are willing to collect, in kilometres.',
    type: Number,
    example: 10,
  })
  alertRadiusKm: number;

  @ApiProperty({
    description: 'Which surplus urgencies they want to hear about.',
    enum: UrgencyThreshold,
    enumName: 'UrgencyThreshold',
    example: UrgencyThreshold.ALL,
  })
  urgencyThreshold: UrgencyThreshold;

  @ApiProperty({
    description: 'Whether push notifications are enabled.',
    example: true,
  })
  pushNotificationsEnabled: boolean;

  @ApiProperty({
    description:
      'Initials of the display name, derived rather than stored, for avatar placeholders.',
    example: 'BA',
  })
  initials: string;

  @ApiProperty({
    description: 'When they joined the platform (ISO 8601). Same as creation.',
    type: String,
    format: 'date-time',
  })
  memberSince: string;

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
    this.registrationCode = data.registrationCode;
    this.mission = data.mission;
    this.serviceArea = data.serviceArea;
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
    this.timezone = data.timezone;
    this.alertRadiusKm = data.alertRadiusKm;
    this.urgencyThreshold = data.urgencyThreshold;
    this.pushNotificationsEnabled = data.pushNotificationsEnabled;
    this.initials = RecipientResponseDto.initialsOf(data.displayName);
    this.memberSince = data.createdAt.toISOString();
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }

  /**
   * Builds avatar initials from the first and last word of a name.
   *
   * Not the first two words: "Banc dels Aliments" would read "BD", because the
   * second word is a preposition rather than part of the name.
   * @param displayName The organization's public name.
   * @returns One or two uppercase letters, empty for a blank name.
   */
  private static initialsOf(displayName: string): string {
    const words = displayName.split(/\s+/).filter((word) => word.length > 0);

    if (words.length === 0) {
      return '';
    }

    const first = words[0][0].toUpperCase();

    return words.length === 1
      ? first
      : first + words[words.length - 1][0].toUpperCase();
  }
}
