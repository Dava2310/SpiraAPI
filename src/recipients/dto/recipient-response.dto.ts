import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FoodCategory } from '../../common/enums/food-category.enum.js';
import { ProfileStatus } from '../../common/enums/profile-status.enum.js';
import type { Recipient } from '../entities/recipient.entity.js';
import { BackgroundCheckStatus } from '../enums/background-check-status.enum.js';
import { DietaryRestriction } from '../enums/dietary-restriction.enum.js';
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

  @ApiProperty({ description: 'URL-friendly identifier.' })
  slug: string;

  @ApiPropertyOptional({
    description: 'Government tax identifier.',
    nullable: true,
  })
  taxId: string | null;

  @ApiPropertyOptional({
    description: 'Nonprofit registration number.',
    nullable: true,
  })
  nonprofitRegistrationNumber: string | null;

  @ApiPropertyOptional({
    description: 'National ID document. Individuals only.',
    nullable: true,
  })
  nationalId: string | null;

  @ApiPropertyOptional({ description: 'Mission statement.', nullable: true })
  mission: string | null;

  @ApiPropertyOptional({ description: 'Public website.', nullable: true })
  website: string | null;

  @ApiPropertyOptional({
    description: 'Absolute URL of the logo.',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiPropertyOptional({
    description: 'How far they are willing to travel, in kilometres.',
    type: Number,
    nullable: true,
  })
  serviceRadiusKm: number | null;

  @ApiProperty({ description: 'Whether they have their own vehicle.' })
  hasVehicle: boolean;

  @ApiPropertyOptional({
    description: 'How much they can carry in one trip, in kilograms.',
    type: Number,
    nullable: true,
  })
  transportCapacityKg: number | null;

  @ApiProperty({ description: 'Whether their transport is refrigerated.' })
  hasRefrigeratedTransport: boolean;

  @ApiPropertyOptional({
    description: 'People fed per week.',
    type: Number,
    nullable: true,
  })
  peopleServedPerWeek: number | null;

  @ApiPropertyOptional({
    description: 'Most they can take in a single day, in kilograms.',
    type: Number,
    nullable: true,
  })
  maxDailyIntakeKg: number | null;

  @ApiPropertyOptional({
    description: 'Categories they will take.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    nullable: true,
  })
  acceptedFoodCategories: FoodCategory[] | null;

  @ApiPropertyOptional({
    description: 'Categories they explicitly refuse.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    nullable: true,
  })
  excludedFoodCategories: FoodCategory[] | null;

  @ApiPropertyOptional({
    description: 'Dietary rules their beneficiaries follow.',
    enum: DietaryRestriction,
    enumName: 'DietaryRestriction',
    isArray: true,
    nullable: true,
  })
  dietaryRestrictions: DietaryRestriction[] | null;

  @ApiProperty({ description: 'Whether they accept near-expiry food.' })
  acceptsNearExpiry: boolean;

  @ApiProperty({ description: 'Whether they accept prepared food.' })
  acceptsPreparedFood: boolean;

  @ApiProperty({ description: 'Whether they accept frozen goods.' })
  acceptsFrozen: boolean;

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

  @ApiProperty({
    description: 'Background-check outcome.',
    enum: BackgroundCheckStatus,
    enumName: 'BackgroundCheckStatus',
    example: BackgroundCheckStatus.NOT_REQUIRED,
  })
  backgroundCheckStatus: BackgroundCheckStatus;

  @ApiPropertyOptional({
    description: 'Liability insurance policy number.',
    nullable: true,
  })
  insurancePolicyNumber: string | null;

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
    this.slug = data.slug;
    this.taxId = data.taxId;
    this.nonprofitRegistrationNumber = data.nonprofitRegistrationNumber;
    this.nationalId = data.nationalId;
    this.mission = data.mission;
    this.website = data.website;
    this.logoUrl = data.logoUrl;
    this.serviceRadiusKm = data.serviceRadiusKm;
    this.hasVehicle = data.hasVehicle;
    this.transportCapacityKg = data.transportCapacityKg;
    this.hasRefrigeratedTransport = data.hasRefrigeratedTransport;
    this.peopleServedPerWeek = data.peopleServedPerWeek;
    this.maxDailyIntakeKg = data.maxDailyIntakeKg;
    this.acceptedFoodCategories = data.acceptedFoodCategories;
    this.excludedFoodCategories = data.excludedFoodCategories;
    this.dietaryRestrictions = data.dietaryRestrictions;
    this.acceptsNearExpiry = data.acceptsNearExpiry;
    this.acceptsPreparedFood = data.acceptsPreparedFood;
    this.acceptsFrozen = data.acceptsFrozen;
    this.status = data.status;
    this.isVerified = data.verifiedAt != null;
    this.verifiedAt = data.verifiedAt ? data.verifiedAt.toISOString() : null;
    this.verifiedById = data.verifiedById;
    this.foodHandlingCertificationNumber = data.foodHandlingCertificationNumber;
    this.certificationExpiresAt = data.certificationExpiresAt;
    this.backgroundCheckStatus = data.backgroundCheckStatus;
    this.insurancePolicyNumber = data.insurancePolicyNumber;
    this.termsAcceptedAt = data.termsAcceptedAt
      ? data.termsAcceptedAt.toISOString()
      : null;
    this.termsVersion = data.termsVersion;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
