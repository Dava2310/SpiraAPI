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
import { Contact } from '../../contacts/entities/contact.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  BUSINESS_TYPE_ENUM_NAME,
  BusinessType,
} from '../enums/business-type.enum.js';
import {
  DONATION_FREQUENCY_ENUM_NAME,
  DonationFrequency,
} from '../enums/donation-frequency.enum.js';

/** A food-surplus donor: supermarket, restaurant, hotel, distributor. */
@Entity('retailer')
@Index('uq_retailer_slug', ['slug'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('uq_retailer_tax_id', ['taxId'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_retailer_status', ['status'], { where: 'deleted_at IS NULL' })
@Index('idx_retailer_categories', ['foodCategories'], { type: 'gin' })
export class Retailer extends SoftDeletableEntity {
  // --- Identity & legal ---

  @ApiProperty({
    description: 'Registered company name.',
    maxLength: 200,
    example: 'Supermercados Real S.A.',
  })
  @Column({ name: 'legal_name', type: 'varchar', length: 200 })
  legalName: string;

  @ApiPropertyOptional({
    description: 'Public brand. Often differs from the legal name.',
    maxLength: 200,
    nullable: true,
    example: 'Real',
  })
  @Column({ name: 'trade_name', type: 'varchar', length: 200, nullable: true })
  tradeName: string | null;

  @ApiProperty({
    description: 'URL-friendly identifier. Unique among non-deleted retailers.',
    maxLength: 120,
    example: 'supermercados-real',
  })
  @Column({ name: 'slug', type: 'varchar', length: 120 })
  slug: string;

  @ApiProperty({
    description:
      'Government tax identifier (RUC/NIT/CIF/EIN). Unique among non-deleted retailers.',
    maxLength: 40,
    example: '80012345-6',
  })
  @Column({ name: 'tax_id', type: 'varchar', length: 40 })
  taxId: string;

  @ApiProperty({
    description:
      'Kind of business, which shapes expected volume and logistics.',
    enum: BusinessType,
    enumName: 'BusinessType',
    example: BusinessType.SUPERMARKET,
  })
  @Column({
    name: 'business_type',
    type: 'enum',
    enum: BusinessType,
    enumName: BUSINESS_TYPE_ENUM_NAME,
  })
  businessType: BusinessType;

  @ApiPropertyOptional({
    description: 'Free-text presentation of the company.',
    nullable: true,
  })
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Public website.',
    maxLength: 255,
    nullable: true,
    example: 'https://real.com.py',
  })
  @Column({ name: 'website', type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @ApiPropertyOptional({
    description: 'Absolute URL of the logo.',
    maxLength: 255,
    nullable: true,
    example: 'https://cdn.spira.app/logos/supermercados-real.png',
  })
  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl: string | null;

  // --- Donation policy (company-level defaults) ---

  @ApiPropertyOptional({
    description: 'Food categories this retailer typically donates.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    nullable: true,
    example: [FoodCategory.PRODUCE, FoodCategory.BAKERY, FoodCategory.DAIRY],
  })
  @Column({
    name: 'food_categories',
    type: 'text',
    array: true,
    nullable: true,
  })
  foodCategories: FoodCategory[] | null;

  @ApiPropertyOptional({
    description: 'How often surplus is expected.',
    enum: DonationFrequency,
    enumName: 'DonationFrequency',
    nullable: true,
    example: DonationFrequency.DAILY,
  })
  @Column({
    name: 'donation_frequency',
    type: 'enum',
    enum: DonationFrequency,
    enumName: DONATION_FREQUENCY_ENUM_NAME,
    nullable: true,
  })
  donationFrequency: DonationFrequency | null;

  @ApiProperty({
    description:
      'Whether the recipient must collect the donation itself. `false` means the retailer delivers.',
    default: true,
    example: true,
  })
  @Column({
    name: 'requires_recipient_transport',
    type: 'boolean',
    default: true,
  })
  requiresRecipientTransport: boolean;

  @ApiPropertyOptional({
    description: 'Lead time the retailer needs before a collection, in hours.',
    type: Number,
    nullable: true,
    example: 4,
  })
  @Column({ name: 'min_pickup_notice_hours', type: 'smallint', nullable: true })
  minPickupNoticeHours: number | null;

  @ApiPropertyOptional({
    description:
      'Practical notes for whoever collects: loading dock, who to ask for, access restrictions.',
    nullable: true,
    example:
      'Enter through the loading dock on Calle Palma and ask for the shift manager.',
  })
  @Column({ name: 'handling_instructions', type: 'text', nullable: true })
  handlingInstructions: string | null;

  // --- Verification & compliance ---

  @ApiProperty({
    description:
      'Lifecycle status. Only `ACTIVE` retailers take part in matching.',
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
      'When an admin approved this retailer. `null` while unverified.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @ApiPropertyOptional({
    description: 'ID of the admin user who approved this retailer.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ApiPropertyOptional({
    description:
      'Food-safety licence number, where the jurisdiction issues one.',
    maxLength: 80,
    nullable: true,
  })
  @Column({
    name: 'food_safety_license_number',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  foodSafetyLicenseNumber: string | null;

  @ApiPropertyOptional({
    description:
      'Licence expiry date (calendar date, no time). Worth alerting on before it passes.',
    type: String,
    format: 'date',
    nullable: true,
    example: '2027-03-31',
  })
  @Column({
    name: 'food_safety_license_expires_at',
    type: 'date',
    nullable: true,
  })
  foodSafetyLicenseExpiresAt: string | null;

  @ApiPropertyOptional({
    description:
      'When the retailer accepted the platform terms. Liability matters in food donation, so this is kept explicitly.',
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
  // `Relation<T>` is required: it keeps `emitDecoratorMetadata` from breaking
  // on the circular imports between entity modules.

  @ApiHideProperty()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifiedBy?: Relation<User> | null;

  @ApiHideProperty()
  @OneToMany(() => Contact, (contact) => contact.retailer)
  contacts?: Relation<Contact>[];

  @ApiHideProperty()
  @OneToMany(() => Location, (location) => location.retailer)
  locations?: Relation<Location>[];

  @ApiHideProperty()
  @OneToMany(() => User, (user) => user.retailer)
  users?: Relation<User>[];
}
