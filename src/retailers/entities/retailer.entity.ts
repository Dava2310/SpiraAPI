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
import {
  PROFILE_STATUS_ENUM_NAME,
  ProfileStatus,
} from '../../common/enums/profile-status.enum.js';
import { Contact } from '../../contacts/entities/contact.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { Partnership } from '../../partnerships/entities/partnership.entity.js';
import { Product } from '../../products/entities/product.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  BUSINESS_TYPE_ENUM_NAME,
  BusinessType,
} from '../enums/business-type.enum.js';

/** A food-surplus donor: supermarket, restaurant, hotel, distributor. */
@Entity('retailer')
@Index('uq_retailer_tax_id', ['taxId'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_retailer_status', ['status'], { where: 'deleted_at IS NULL' })
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

  // --- Verification & compliance ---

  @ApiProperty({
    description:
      'Lifecycle status. Only `ACTIVE` retailers can create donations.',
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

  @ApiHideProperty()
  @OneToMany(() => Product, (product) => product.retailer)
  products?: Relation<Product>[];

  @ApiHideProperty()
  @OneToMany(() => Partnership, (partnership) => partnership.retailer)
  partnerships?: Relation<Partnership>[];
}
