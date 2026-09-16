import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import { FoodCategory } from '../../common/enums/food-category.enum.js';
import {
  PROFILE_STATUS_ENUM_NAME,
  ProfileStatus,
} from '../../common/enums/profile-status.enum.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { Contact } from '../../contacts/entities/contact.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  BACKGROUND_CHECK_STATUS_ENUM_NAME,
  BackgroundCheckStatus,
} from '../enums/background-check-status.enum.js';
import { DietaryRestriction } from '../enums/dietary-restriction.enum.js';
import {
  RECIPIENT_TYPE_ENUM_NAME,
  RecipientType,
} from '../enums/recipient-type.enum.js';

/** A food receiver: NGO, foodbank, soup kitchen, or certified individual. */
@Entity('recipient')
@Index('uq_recipient_slug', ['slug'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('uq_recipient_tax_id', ['taxId'], {
  unique: true,
  where: 'deleted_at IS NULL AND tax_id IS NOT NULL',
})
@Index('idx_recipient_status', ['status'], { where: 'deleted_at IS NULL' })
@Index('idx_recipient_categories', ['acceptedFoodCategories'], { type: 'gin' })
export class Recipient extends SoftDeletableEntity {
  // --- Identity ---

  @ApiProperty({
    description: 'What kind of receiver this is.',
    enum: RecipientType,
    enumName: 'RecipientType',
    example: RecipientType.FOOD_BANK,
  })
  @Column({
    name: 'type',
    type: 'enum',
    enum: RecipientType,
    enumName: RECIPIENT_TYPE_ENUM_NAME,
  })
  type: RecipientType;

  @ApiPropertyOptional({
    description:
      'Registered organization name. `null` for `CERTIFIED_INDIVIDUAL`, who has no legal entity.',
    maxLength: 200,
    nullable: true,
    example: 'Fundación Banco de Alimentos Paraguay',
  })
  @Column({ name: 'legal_name', type: 'varchar', length: 200, nullable: true })
  legalName: string | null;

  @ApiProperty({
    description:
      "Always present — the organization's public name, or the person's name for an individual.",
    maxLength: 200,
    example: 'Banco de Alimentos Paraguay',
  })
  @Column({ name: 'display_name', type: 'varchar', length: 200 })
  displayName: string;

  @ApiProperty({
    description:
      'URL-friendly identifier. Unique among non-deleted recipients.',
    maxLength: 120,
    example: 'banco-de-alimentos-py',
  })
  @Column({ name: 'slug', type: 'varchar', length: 120 })
  slug: string;

  @ApiPropertyOptional({
    description:
      'Government tax identifier. Organizations only, and unique when present.',
    maxLength: 40,
    nullable: true,
    example: '80098765-4',
  })
  @Column({ name: 'tax_id', type: 'varchar', length: 40, nullable: true })
  taxId: string | null;

  @ApiPropertyOptional({
    description: 'Registration number proving nonprofit status.',
    maxLength: 80,
    nullable: true,
  })
  @Column({
    name: 'nonprofit_registration_number',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  nonprofitRegistrationNumber: string | null;

  @ApiPropertyOptional({
    description: 'National ID document. Individuals only.',
    maxLength: 40,
    nullable: true,
  })
  @Column({ name: 'national_id', type: 'varchar', length: 40, nullable: true })
  nationalId: string | null;

  @ApiPropertyOptional({
    description: 'Free-text description of who they serve and how.',
    nullable: true,
  })
  @Column({ name: 'mission', type: 'text', nullable: true })
  mission: string | null;

  @ApiPropertyOptional({
    description: 'Public website.',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'website', type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @ApiPropertyOptional({
    description: 'Absolute URL of the logo.',
    maxLength: 255,
    nullable: true,
  })
  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl: string | null;

  // --- Transport capability ---

  @ApiPropertyOptional({
    description: 'How far they are willing to travel, in kilometres.',
    type: Number,
    nullable: true,
    example: 15,
  })
  @Column({ name: 'service_radius_km', type: 'smallint', nullable: true })
  serviceRadiusKm: number | null;

  @ApiProperty({
    description: 'Whether they have their own vehicle for collections.',
    default: false,
    example: true,
  })
  @Column({ name: 'has_vehicle', type: 'boolean', default: false })
  hasVehicle: boolean;

  @ApiPropertyOptional({
    description: 'How much they can carry in one trip, in kilograms.',
    type: Number,
    nullable: true,
    example: 750.5,
  })
  @Column({
    name: 'transport_capacity_kg',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  transportCapacityKg: number | null;

  @ApiProperty({
    description: 'Whether their transport is refrigerated.',
    default: false,
    example: false,
  })
  @Column({
    name: 'has_refrigerated_transport',
    type: 'boolean',
    default: false,
  })
  hasRefrigeratedTransport: boolean;

  // --- Capacity & acceptance rules ---

  @ApiPropertyOptional({
    description: 'People fed per week.',
    type: Number,
    nullable: true,
    example: 1200,
  })
  @Column({ name: 'people_served_per_week', type: 'integer', nullable: true })
  peopleServedPerWeek: number | null;

  @ApiPropertyOptional({
    description: 'Most they can take in a single day, in kilograms.',
    type: Number,
    nullable: true,
    example: 2000,
  })
  @Column({
    name: 'max_daily_intake_kg',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  maxDailyIntakeKg: number | null;

  @ApiPropertyOptional({
    description: 'Categories they will take.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    nullable: true,
    example: [FoodCategory.PRODUCE, FoodCategory.DRY_GOODS],
  })
  @Column({
    name: 'accepted_food_categories',
    type: 'text',
    array: true,
    nullable: true,
  })
  acceptedFoodCategories: FoodCategory[] | null;

  @ApiPropertyOptional({
    description:
      'Categories they explicitly refuse, even if otherwise eligible.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    nullable: true,
    example: [FoodCategory.MEAT],
  })
  @Column({
    name: 'excluded_food_categories',
    type: 'text',
    array: true,
    nullable: true,
  })
  excludedFoodCategories: FoodCategory[] | null;

  @ApiPropertyOptional({
    description: 'Dietary rules their beneficiaries follow.',
    enum: DietaryRestriction,
    enumName: 'DietaryRestriction',
    isArray: true,
    nullable: true,
    example: [DietaryRestriction.NO_PORK, DietaryRestriction.NO_ALCOHOL],
  })
  @Column({
    name: 'dietary_restrictions',
    type: 'text',
    array: true,
    nullable: true,
  })
  dietaryRestrictions: DietaryRestriction[] | null;

  @ApiProperty({
    description: 'Whether they accept food close to its expiry date.',
    default: false,
    example: true,
  })
  @Column({ name: 'accepts_near_expiry', type: 'boolean', default: false })
  acceptsNearExpiry: boolean;

  @ApiProperty({
    description:
      'Whether they accept already-prepared food. Carries higher liability, so it is opt-in.',
    default: false,
    example: false,
  })
  @Column({ name: 'accepts_prepared_food', type: 'boolean', default: false })
  acceptsPreparedFood: boolean;

  @ApiProperty({
    description: 'Whether they accept frozen goods.',
    default: false,
    example: false,
  })
  @Column({ name: 'accepts_frozen', type: 'boolean', default: false })
  acceptsFrozen: boolean;

  // --- Verification & compliance ---

  @ApiProperty({
    description:
      'Lifecycle status. Only `ACTIVE` recipients take part in matching.',
    enum: ProfileStatus,
    enumName: 'ProfileStatus',
    default: ProfileStatus.PENDING_VERIFICATION,
    example: ProfileStatus.ACTIVE,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ProfileStatus,
    enumName: PROFILE_STATUS_ENUM_NAME,
    default: ProfileStatus.PENDING_VERIFICATION,
  })
  status: ProfileStatus;

  @ApiPropertyOptional({
    description:
      'When an admin approved this recipient. `null` while unverified.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @ApiPropertyOptional({
    description: 'ID of the admin user who approved this recipient.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ApiPropertyOptional({
    description: 'Food-handling certification number.',
    maxLength: 80,
    nullable: true,
  })
  @Column({
    name: 'food_handling_certification_number',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  foodHandlingCertificationNumber: string | null;

  @ApiPropertyOptional({
    description: 'Certification expiry date (calendar date, no time).',
    type: String,
    format: 'date',
    nullable: true,
    example: '2027-06-30',
  })
  @Column({ name: 'certification_expires_at', type: 'date', nullable: true })
  certificationExpiresAt: string | null;

  @ApiProperty({
    description:
      'Background-check outcome. Matters most for `CERTIFIED_INDIVIDUAL`; organizations are usually `NOT_REQUIRED`.',
    enum: BackgroundCheckStatus,
    enumName: 'BackgroundCheckStatus',
    default: BackgroundCheckStatus.NOT_REQUIRED,
    example: BackgroundCheckStatus.PASSED,
  })
  @Column({
    name: 'background_check_status',
    type: 'enum',
    enum: BackgroundCheckStatus,
    enumName: BACKGROUND_CHECK_STATUS_ENUM_NAME,
    default: BackgroundCheckStatus.NOT_REQUIRED,
  })
  backgroundCheckStatus: BackgroundCheckStatus;

  @ApiPropertyOptional({
    description:
      'Liability insurance policy number. Required in some jurisdictions.',
    maxLength: 80,
    nullable: true,
  })
  @Column({
    name: 'insurance_policy_number',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  insurancePolicyNumber: string | null;

  @ApiPropertyOptional({
    description: 'When the recipient accepted the platform terms.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'terms_accepted_at', type: 'timestamptz', nullable: true })
  termsAcceptedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Version of the terms that was accepted.',
    maxLength: 20,
    nullable: true,
    example: '2026-01',
  })
  @Column({
    name: 'terms_version',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  termsVersion: string | null;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifiedBy?: Relation<User> | null;

  @ApiHideProperty()
  @OneToMany(() => Contact, (contact) => contact.recipient)
  contacts?: Relation<Contact>[];

  @ApiHideProperty()
  @OneToMany(() => Location, (location) => location.recipient)
  locations?: Relation<Location>[];

  @ApiHideProperty()
  @OneToMany(() => User, (user) => user.recipient)
  users?: Relation<User>[];
}
