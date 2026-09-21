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
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { Contact } from '../../contacts/entities/contact.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { Partnership } from '../../partnerships/entities/partnership.entity.js';
import { RecipientVehicle } from '../../recipient-vehicles/entities/recipient-vehicle.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  RECIPIENT_TYPE_ENUM_NAME,
  RecipientType,
} from '../enums/recipient-type.enum.js';
import {
  URGENCY_THRESHOLD_ENUM_NAME,
  UrgencyThreshold,
} from '../enums/urgency-threshold.enum.js';

/** A food receiver: NGO, foodbank, soup kitchen, shelter. */
@Entity('recipient')
@Index('uq_recipient_tax_id', ['taxId'], {
  unique: true,
  where: 'deleted_at IS NULL AND tax_id IS NOT NULL',
})
@Index('idx_recipient_status', ['status'], { where: 'deleted_at IS NULL' })
@Index('uq_recipient_registration_code', ['registrationCode'], {
  unique: true,
  where: 'deleted_at IS NULL AND registration_code IS NOT NULL',
})
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
    description: 'Registered organization name.',
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

  @ApiPropertyOptional({
    description: 'Abbreviated name, used wherever the UI is short of space.',
    maxLength: 80,
    nullable: true,
    example: 'Banco de Alimentos',
  })
  @Column({ name: 'short_name', type: 'varchar', length: 80, nullable: true })
  shortName: string | null;

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
    description:
      'Charity / non-profit registration number, distinct from the tax identifier and what the NGO app displays as proof of standing.',
    maxLength: 40,
    nullable: true,
    example: 'G-12345678',
  })
  @Column({
    name: 'registration_code',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  registrationCode: string | null;

  @ApiPropertyOptional({
    description: 'Free-text description of who they serve and how.',
    nullable: true,
  })
  @Column({ name: 'mission', type: 'text', nullable: true })
  mission: string | null;

  @ApiPropertyOptional({
    description: 'Where they operate, as they describe it themselves.',
    maxLength: 200,
    nullable: true,
    example: 'Barcelona metropolitan area',
  })
  @Column({
    name: 'service_area',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  serviceArea: string | null;

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

  // --- Verification & compliance ---

  @ApiProperty({
    description:
      'Lifecycle status. Only `ACTIVE` recipients can be offered donations.',
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

  // --- Surplus alert preferences ---

  @ApiProperty({
    description:
      'IANA timezone the organization works in, used to render pickup windows and alert times.',
    maxLength: 50,
    default: 'Europe/Madrid',
    example: 'Europe/Madrid',
  })
  @Column({
    name: 'timezone',
    type: 'varchar',
    length: 50,
    default: 'Europe/Madrid',
  })
  timezone: string;

  @ApiProperty({
    description:
      'How far from their locations they are willing to collect. Bounds the surplus shelf and the map.',
    type: Number,
    default: 5,
    example: 5,
  })
  @Column({
    name: 'alert_radius_km',
    type: 'numeric',
    precision: 4,
    scale: 1,
    default: 5,
    transformer: numericTransformer,
  })
  alertRadiusKm: number;

  @ApiProperty({
    description: 'Which surplus urgencies are worth alerting them about.',
    enum: UrgencyThreshold,
    enumName: 'UrgencyThreshold',
    default: UrgencyThreshold.ALL,
    example: UrgencyThreshold.CRITICAL_EXPIRING,
  })
  @Column({
    name: 'urgency_threshold',
    type: 'enum',
    enum: UrgencyThreshold,
    enumName: URGENCY_THRESHOLD_ENUM_NAME,
    default: UrgencyThreshold.ALL,
  })
  urgencyThreshold: UrgencyThreshold;

  @ApiProperty({
    description: 'Whether to send push notifications for new surplus.',
    default: true,
    example: true,
  })
  @Column({
    name: 'push_notifications_enabled',
    type: 'boolean',
    default: true,
  })
  pushNotificationsEnabled: boolean;

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

  @ApiHideProperty()
  @OneToMany(() => RecipientVehicle, (vehicle) => vehicle.recipient)
  vehicles?: Relation<RecipientVehicle>[];

  @ApiHideProperty()
  @OneToMany(() => Partnership, (partnership) => partnership.recipient)
  partnerships?: Relation<Partnership>[];
}
