import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { Recipient } from '../../recipients/entities/recipient.entity.js';
import { Retailer } from '../../retailers/entities/retailer.entity.js';
import {
  LOCATION_TYPE_ENUM_NAME,
  LocationType,
} from '../enums/location-type.enum.js';
import type { PickupWindow } from './pickup-window.interface.js';

/** A physical site belonging to a retailer or a recipient. */
@Entity('location')
@Check('chk_location_owner', 'num_nonnulls(retailer_id, recipient_id) = 1')
@Index('idx_location_retailer', ['retailerId'])
@Index('idx_location_recipient', ['recipientId'])
@Index('uq_location_primary_retailer', ['retailerId'], {
  unique: true,
  where: 'is_primary AND retailer_id IS NOT NULL AND deleted_at IS NULL',
})
@Index('uq_location_primary_recipient', ['recipientId'], {
  unique: true,
  where: 'is_primary AND recipient_id IS NOT NULL AND deleted_at IS NULL',
})
@Index('idx_location_geo', ['latitude', 'longitude'])
export class Location extends SoftDeletableEntity {
  // --- Owner — exactly one of the two is set ---

  @ApiPropertyOptional({
    description:
      'Owning retailer. Exactly one of `retailerId` / `recipientId` is set.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'retailer_id', type: 'uuid', nullable: true })
  retailerId: string | null;

  @ApiPropertyOptional({
    description:
      'Owning recipient. Exactly one of `retailerId` / `recipientId` is set.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  recipientId: string | null;

  // --- Identity ---

  @ApiProperty({
    description: 'Human-readable name for the site.',
    maxLength: 150,
    example: 'Sucursal Centro',
  })
  @Column({ name: 'label', type: 'varchar', length: 150 })
  label: string;

  @ApiProperty({
    description: 'What kind of site this is.',
    enum: LocationType,
    enumName: 'LocationType',
    example: LocationType.STORE,
  })
  @Column({
    name: 'type',
    type: 'enum',
    enum: LocationType,
    enumName: LOCATION_TYPE_ENUM_NAME,
  })
  type: LocationType;

  // --- Address ---

  @ApiProperty({
    description: 'Street address, first line.',
    maxLength: 200,
    example: 'Palma 456',
  })
  @Column({ name: 'address_line1', type: 'varchar', length: 200 })
  addressLine1: string;

  @ApiPropertyOptional({
    description: 'Street address, second line — unit, floor, landmark.',
    maxLength: 200,
    nullable: true,
    example: 'esq. Alberdi',
  })
  @Column({
    name: 'address_line2',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  addressLine2: string | null;

  @ApiProperty({
    description: 'City.',
    maxLength: 100,
    example: 'Asunción',
  })
  @Column({ name: 'city', type: 'varchar', length: 100 })
  city: string;

  @ApiPropertyOptional({
    description: 'State, region or department.',
    maxLength: 100,
    nullable: true,
    example: 'Central',
  })
  @Column({ name: 'state', type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @ApiPropertyOptional({
    description: 'Postal code.',
    maxLength: 20,
    nullable: true,
    example: '1209',
  })
  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  @ApiProperty({
    description: 'Country as an ISO 3166-1 alpha-2 code.',
    minLength: 2,
    maxLength: 2,
    example: 'PY',
  })
  @Column({ name: 'country_code', type: 'char', length: 2 })
  countryCode: string;

  // --- Geo & time ---

  @ApiPropertyOptional({
    description: 'Latitude in decimal degrees.',
    type: Number,
    nullable: true,
    example: -25.281,
  })
  @Column({
    name: 'latitude',
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: numericTransformer,
  })
  latitude: number | null;

  @ApiPropertyOptional({
    description: 'Longitude in decimal degrees.',
    type: Number,
    nullable: true,
    example: -57.635,
  })
  @Column({
    name: 'longitude',
    type: 'numeric',
    precision: 10,
    scale: 6,
    nullable: true,
    transformer: numericTransformer,
  })
  longitude: number | null;

  @ApiProperty({
    description: 'IANA timezone of the site. `pickupWindows` are local to it.',
    maxLength: 50,
    example: 'America/Asuncion',
  })
  @Column({ name: 'timezone', type: 'varchar', length: 50 })
  timezone: string;

  @ApiPropertyOptional({
    description: 'Recurring collection availability, by weekday.',
    type: 'array',
    nullable: true,
    items: {
      type: 'object',
      required: ['weekday', 'startTime', 'endTime'],
      properties: {
        weekday: {
          type: 'integer',
          minimum: 1,
          maximum: 7,
          description: 'ISO-8601 weekday: 1 = Monday … 7 = Sunday.',
        },
        startTime: { type: 'string', example: '18:00' },
        endTime: { type: 'string', example: '20:00' },
        note: { type: 'string', example: 'after closing' },
      },
    },
    example: [
      { weekday: 1, startTime: '18:00', endTime: '20:00' },
      { weekday: 4, startTime: '18:00', endTime: '20:00' },
    ],
  })
  @Column({ name: 'pickup_windows', type: 'jsonb', nullable: true })
  pickupWindows: PickupWindow[] | null;

  // --- Storage capability ---

  @ApiProperty({
    description: 'Whether the site has refrigerated storage.',
    default: false,
    example: true,
  })
  @Column({ name: 'has_cold_storage', type: 'boolean', default: false })
  hasColdStorage: boolean;

  @ApiProperty({
    description: 'Whether the site has a freezer.',
    default: false,
    example: false,
  })
  @Column({ name: 'has_freezer', type: 'boolean', default: false })
  hasFreezer: boolean;

  @ApiPropertyOptional({
    description: 'How much the site can hold, in kilograms.',
    type: Number,
    nullable: true,
    example: 5000,
  })
  @Column({
    name: 'storage_capacity_kg',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  storageCapacityKg: number | null;

  // --- Operational flags ---

  @ApiPropertyOptional({
    description:
      'Direct line for the site, in E.164 format. May differ from any contact.',
    maxLength: 30,
    nullable: true,
    example: '+595214451234',
  })
  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @ApiProperty({
    description: 'Marks the headquarters / main site. At most one per owner.',
    default: false,
    example: true,
  })
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @ApiProperty({
    description:
      'Set to `false` to take the site out of matching temporarily, without deleting it.',
    default: true,
    example: true,
  })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Retailer, (retailer) => retailer.locations, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'retailer_id' })
  retailer?: Relation<Retailer> | null;

  @ApiHideProperty()
  @ManyToOne(() => Recipient, (recipient) => recipient.locations, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Relation<Recipient> | null;
}
