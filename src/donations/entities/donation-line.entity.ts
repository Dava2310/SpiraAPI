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
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import {
  DONATION_REASON_ENUM_NAME,
  DonationReason,
} from '../../common/enums/donation-reason.enum.js';
import {
  PRODUCT_CATEGORY_ENUM_NAME,
  ProductCategory,
} from '../../common/enums/product-category.enum.js';
import {
  UNIT_OF_MEASURE_ENUM_NAME,
  UnitOfMeasure,
} from '../../common/enums/unit-of-measure.enum.js';
import {
  EXPIRY_KIND_ENUM_NAME,
  ExpiryKind,
} from '../../common/enums/expiry-kind.enum.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity.js';
import { Donation } from './donation.entity.js';

/**
 * One line of a donation, snapshotting what left the store.
 *
 * The product description is copied here rather than read through
 * `inventoryItemId`, so renaming a product later cannot rewrite a certificate
 * that has already been issued.
 */
@Entity('donation_line')
@Index('idx_donation_line_donation', ['donationId'])
@Index('idx_donation_line_item', ['inventoryItemId'])
export class DonationLine extends SoftDeletableEntity {
  @ApiProperty({ description: 'Owning donation.', format: 'uuid' })
  @Column({ name: 'donation_id', type: 'uuid' })
  donationId: string;

  @ApiPropertyOptional({
    description:
      'Stock lot this line came from. Provenance only — the snapshot below is authoritative.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'inventory_item_id', type: 'uuid', nullable: true })
  inventoryItemId: string | null;

  @ApiProperty({
    description: 'Product name as it was at handover.',
    maxLength: 200,
    example: 'Organic Whole Milk 1 Gal (4-Pack)',
  })
  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  productName: string;

  @ApiPropertyOptional({
    description: 'Brand as it was at handover.',
    maxLength: 120,
    nullable: true,
  })
  @Column({ name: 'brand', type: 'varchar', length: 120, nullable: true })
  brand: string | null;

  @ApiPropertyOptional({
    description: 'Barcode as it was at handover.',
    maxLength: 14,
    nullable: true,
  })
  @Column({ name: 'barcode', type: 'varchar', length: 14, nullable: true })
  barcode: string | null;

  @ApiProperty({
    description: 'Department as it was at handover.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
    example: ProductCategory.DAIRY,
  })
  @Column({
    name: 'category',
    type: 'enum',
    enum: ProductCategory,
    enumName: PRODUCT_CATEGORY_ENUM_NAME,
  })
  category: ProductCategory;

  @ApiProperty({
    description: 'Quantity handed over.',
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
    description: 'Weight of this line.',
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
    description: 'Retail value of this whole line, not of one unit.',
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

  @ApiProperty({
    description: 'Why the line was donatable.',
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
    description: 'Condition notes, reproduced on the certificate.',
    nullable: true,
  })
  @Column({ name: 'reason_description', type: 'text', nullable: true })
  reasonDescription: string | null;

  @ApiPropertyOptional({
    description:
      'Expiry copied from the lot at snapshot time, so a delivered donation still shows what it was carrying.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @ApiPropertyOptional({
    description:
      'Which kind of date `expiresAt` was, snapshotted with it. The certificate is the record of what was handed over, and whether the date was a quality one or a safety one is the part that would matter if anyone ever asked.',
    enum: ExpiryKind,
    enumName: 'ExpiryKind',
    nullable: true,
    example: ExpiryKind.BEST_BEFORE,
  })
  @Column({
    name: 'expiry_kind',
    type: 'enum',
    enum: ExpiryKind,
    enumName: EXPIRY_KIND_ENUM_NAME,
    nullable: true,
  })
  expiryKind: ExpiryKind | null;

  @ApiPropertyOptional({
    description: 'Retail value of a single unit at snapshot time.',
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
    description: 'How the unit was named on the lot — "bottles", "trays".',
    maxLength: 20,
    nullable: true,
    example: 'bottles',
  })
  @Column({ name: 'unit_label', type: 'varchar', length: 20, nullable: true })
  unitLabel: string | null;

  @ApiPropertyOptional({
    description: 'Image copied from the lot or the catalogue at snapshot time.',
    maxLength: 500,
    nullable: true,
  })
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Donation, (donation) => donation.lines, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'donation_id' })
  donation?: Relation<Donation>;

  @ApiHideProperty()
  @ManyToOne(() => InventoryItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem?: Relation<InventoryItem> | null;
}
