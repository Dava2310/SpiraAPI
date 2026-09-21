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
import {
  DONATION_REASON_ENUM_NAME,
  DonationReason,
} from '../../common/enums/donation-reason.enum.js';
import {
  UNIT_OF_MEASURE_ENUM_NAME,
  UnitOfMeasure,
} from '../../common/enums/unit-of-measure.enum.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { Donation } from '../../donations/entities/donation.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { Product } from '../../products/entities/product.entity.js';
import {
  INVENTORY_ITEM_STATUS_ENUM_NAME,
  InventoryItemStatus,
} from '../enums/inventory-item-status.enum.js';

/**
 * A lot of stock at one branch, flagged as donatable for one reason.
 *
 * Not general stock control: a row exists because somebody decided this
 * quantity should be given away rather than sold.
 */
@Entity('inventory_item')
@Check('chk_inventory_quantity', 'quantity > 0 AND weight_kg >= 0')
// A reserved or donated lot must name its donation; an available one must not.
@Check(
  'chk_inventory_donation',
  `(status IN ('RESERVED', 'DONATED') AND donation_id IS NOT NULL)
   OR (status IN ('IN_INVENTORY', 'WITHDRAWN', 'EXPIRED') AND donation_id IS NULL)`,
)
@Index('idx_inventory_location_status', ['locationId', 'status'], {
  where: 'deleted_at IS NULL',
})
@Index('idx_inventory_expiry', ['expiresAt'], {
  where: "deleted_at IS NULL AND status = 'IN_INVENTORY'",
})
// The surplus shelf query: listed, available stock at a location, soonest first.
@Index('idx_inventory_listed', ['isListed', 'status', 'expiresAt'], {
  where: "deleted_at IS NULL AND is_listed = true AND status = 'IN_INVENTORY'",
})
@Index('idx_inventory_product', ['productId'])
@Index('idx_inventory_donation', ['donationId'])
export class InventoryItem extends SoftDeletableEntity {
  @ApiProperty({
    description: 'Branch holding the stock.',
    format: 'uuid',
  })
  @Column({ name: 'location_id', type: 'uuid' })
  locationId: string;

  @ApiProperty({ description: 'What the lot contains.', format: 'uuid' })
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ApiProperty({
    description: 'How much there is, counted in `unit`.',
    type: Number,
    example: 4,
  })
  @Column({
    name: 'quantity',
    type: 'numeric',
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit the quantity is counted in.',
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PACK,
  })
  @Column({
    name: 'unit',
    type: 'enum',
    enum: UnitOfMeasure,
    enumName: UNIT_OF_MEASURE_ENUM_NAME,
  })
  unit: UnitOfMeasure;

  @ApiProperty({
    description:
      'Weight of the whole lot. Stored rather than derived, because pack weights vary and staff may weigh it.',
    type: Number,
    example: 6,
  })
  @Column({
    name: 'weight_kg',
    type: 'numeric',
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  weightKg: number;

  @ApiPropertyOptional({
    description: 'Retail value of the whole lot, not of one unit.',
    type: Number,
    nullable: true,
    example: 28,
  })
  @Column({
    name: 'retail_value',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  retailValue: number | null;

  @ApiPropertyOptional({
    description:
      'Retail value of a single unit, shown alongside the lot total.',
    type: Number,
    nullable: true,
    example: 1.25,
  })
  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  unitPrice: number | null;

  @ApiPropertyOptional({
    description:
      'How the unit is named to staff — "bottles", "loaves", "trays". Display only; `unit` stays the canonical measure for arithmetic.',
    maxLength: 20,
    nullable: true,
    example: 'bottles',
  })
  @Column({ name: 'unit_label', type: 'varchar', length: 20, nullable: true })
  unitLabel: string | null;

  @ApiPropertyOptional({
    description:
      'Photo of this particular lot, overriding the catalogue image when set.',
    maxLength: 500,
    nullable: true,
  })
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @ApiProperty({
    description: 'Currency of `retailValue`, as an ISO 4217 code.',
    minLength: 3,
    maxLength: 3,
    default: 'EUR',
    example: 'EUR',
  })
  @Column({ name: 'currency', type: 'char', length: 3, default: 'EUR' })
  currency: string;

  @ApiPropertyOptional({
    description:
      'When the lot expires, to the minute. A plain date is not enough: urgency turns on 23:59 versus 20:00 today. Hours remaining is derived from this, never stored.',
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-09-18T23:59:00.000Z',
  })
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({
    description: 'Why the lot is donatable rather than sellable.',
    enum: DonationReason,
    enumName: 'DonationReason',
    example: DonationReason.NEAR_EXPIRY,
  })
  @Column({
    name: 'reason',
    type: 'enum',
    enum: DonationReason,
    enumName: DONATION_REASON_ENUM_NAME,
  })
  reason: DonationReason;

  @ApiPropertyOptional({
    description:
      'Condition notes for the recipient, reproduced on the donation certificate.',
    nullable: true,
    example:
      '24 hours remaining before the best-by date. Kept in unbroken cold chain storage.',
  })
  @Column({ name: 'reason_description', type: 'text', nullable: true })
  reasonDescription: string | null;

  @ApiProperty({
    description: 'Lifecycle state.',
    enum: InventoryItemStatus,
    enumName: 'InventoryItemStatus',
    default: InventoryItemStatus.IN_INVENTORY,
    example: InventoryItemStatus.IN_INVENTORY,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: InventoryItemStatus,
    enumName: INVENTORY_ITEM_STATUS_ENUM_NAME,
    default: InventoryItemStatus.IN_INVENTORY,
  })
  status: InventoryItemStatus;

  @ApiProperty({
    description:
      'Whether the lot is published to the surplus shelf, where any active recipient in range can claim it.',
    default: false,
    example: true,
  })
  @Column({ name: 'is_listed', type: 'boolean', default: false })
  isListed: boolean;

  @ApiPropertyOptional({
    description:
      'Donation this lot is committed to. Retained after handover so a delivered lot keeps its provenance.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'donation_id', type: 'uuid', nullable: true })
  donationId: string | null;

  @ApiProperty({
    description: 'When the lot was logged.',
    type: String,
    format: 'date-time',
  })
  @Column({ name: 'listed_at', type: 'timestamptz', default: () => 'now()' })
  listedAt: Date;

  @ApiPropertyOptional({
    description: 'When the lot was added to a donation.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'queued_at', type: 'timestamptz', nullable: true })
  queuedAt: Date | null;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Location, (location) => location.inventoryItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'location_id' })
  location?: Relation<Location>;

  @ApiHideProperty()
  @ManyToOne(() => Product, (product) => product.inventoryItems, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product?: Relation<Product>;

  @ApiHideProperty()
  @ManyToOne(() => Donation, (donation) => donation.inventoryItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'donation_id' })
  donation?: Relation<Donation> | null;
}
