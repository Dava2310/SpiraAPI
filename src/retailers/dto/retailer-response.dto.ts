import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FoodCategory } from '../../common/enums/food-category.enum.js';
import { ProfileStatus } from '../../common/enums/profile-status.enum.js';
import type { Retailer } from '../entities/retailer.entity.js';
import { BusinessType } from '../enums/business-type.enum.js';
import { DonationFrequency } from '../enums/donation-frequency.enum.js';

/** API representation of a retailer. */
export class RetailerResponseDto {
  @ApiProperty({ description: 'Unique retailer ID.', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Registered company name.',
    example: 'Supermercados Real S.A.',
  })
  legalName: string;

  @ApiPropertyOptional({
    description: 'Public brand.',
    nullable: true,
    example: 'Real',
  })
  tradeName: string | null;

  @ApiProperty({
    description: 'URL-friendly identifier.',
    example: 'supermercados-real',
  })
  slug: string;

  @ApiProperty({
    description: 'Government tax identifier.',
    example: '80012345-6',
  })
  taxId: string;

  @ApiProperty({
    description: 'Kind of business.',
    enum: BusinessType,
    enumName: 'BusinessType',
    example: BusinessType.SUPERMARKET,
  })
  businessType: BusinessType;

  @ApiPropertyOptional({ description: 'Company description.', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ description: 'Public website.', nullable: true })
  website: string | null;

  @ApiPropertyOptional({
    description: 'Absolute URL of the logo.',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiPropertyOptional({
    description: 'Food categories typically donated.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    nullable: true,
  })
  foodCategories: FoodCategory[] | null;

  @ApiPropertyOptional({
    description: 'How often surplus is expected.',
    enum: DonationFrequency,
    enumName: 'DonationFrequency',
    nullable: true,
  })
  donationFrequency: DonationFrequency | null;

  @ApiProperty({
    description: 'Whether the recipient must collect the donation.',
    example: true,
  })
  requiresRecipientTransport: boolean;

  @ApiPropertyOptional({
    description: 'Lead time needed before a collection, in hours.',
    type: Number,
    nullable: true,
  })
  minPickupNoticeHours: number | null;

  @ApiPropertyOptional({
    description: 'Notes for whoever collects.',
    nullable: true,
  })
  handlingInstructions: string | null;

  @ApiProperty({
    description: 'Lifecycle status.',
    enum: ProfileStatus,
    enumName: 'ProfileStatus',
    example: ProfileStatus.PENDING_VERIFICATION,
  })
  status: ProfileStatus;

  @ApiProperty({
    description: 'Whether an admin has verified this retailer.',
    example: false,
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'When the retailer was verified (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  verifiedAt: string | null;

  @ApiPropertyOptional({
    description: 'ID of the admin who verified this retailer.',
    format: 'uuid',
    nullable: true,
  })
  verifiedById: string | null;

  @ApiPropertyOptional({
    description: 'Food-safety licence number.',
    nullable: true,
  })
  foodSafetyLicenseNumber: string | null;

  @ApiPropertyOptional({
    description: 'Licence expiry date.',
    type: String,
    format: 'date',
    nullable: true,
  })
  foodSafetyLicenseExpiresAt: string | null;

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
    description: 'When the retailer was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the retailer was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a Retailer entity onto its API representation.
   * @param data The Retailer entity loaded from the database.
   */
  constructor(data: Retailer) {
    this.id = data.id;
    this.legalName = data.legalName;
    this.tradeName = data.tradeName;
    this.slug = data.slug;
    this.taxId = data.taxId;
    this.businessType = data.businessType;
    this.description = data.description;
    this.website = data.website;
    this.logoUrl = data.logoUrl;
    this.foodCategories = data.foodCategories;
    this.donationFrequency = data.donationFrequency;
    this.requiresRecipientTransport = data.requiresRecipientTransport;
    this.minPickupNoticeHours = data.minPickupNoticeHours;
    this.handlingInstructions = data.handlingInstructions;
    this.status = data.status;
    this.isVerified = data.verifiedAt != null;
    this.verifiedAt = data.verifiedAt ? data.verifiedAt.toISOString() : null;
    this.verifiedById = data.verifiedById;
    this.foodSafetyLicenseNumber = data.foodSafetyLicenseNumber;
    this.foodSafetyLicenseExpiresAt = data.foodSafetyLicenseExpiresAt;
    this.termsAcceptedAt = data.termsAcceptedAt
      ? data.termsAcceptedAt.toISOString()
      : null;
    this.termsVersion = data.termsVersion;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
