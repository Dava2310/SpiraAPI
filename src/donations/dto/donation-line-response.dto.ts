import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DonationReason } from '../../common/enums/donation-reason.enum.js';
import { ProductCategory } from '../../common/enums/product-category.enum.js';
import { SurplusUrgency } from '../../common/enums/surplus-urgency.enum.js';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum.js';
import { expiryView } from '../../common/expiry/expiry.view.js';
import type { DonationLine } from '../entities/donation-line.entity.js';

/** API representation of one donation line, as snapshotted at handover. */
export class DonationLineResponseDto {
  @ApiProperty({ description: 'Unique line ID.', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({
    description: 'Stock lot this line came from.',
    format: 'uuid',
    nullable: true,
  })
  inventoryItemId: string | null;

  @ApiProperty({ description: 'Product name as it was at handover.' })
  productName: string;

  @ApiPropertyOptional({ description: 'Brand as it was.', nullable: true })
  brand: string | null;

  @ApiPropertyOptional({ description: 'Barcode as it was.', nullable: true })
  barcode: string | null;

  @ApiProperty({
    description: 'Department as it was.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
    example: ProductCategory.DAIRY,
  })
  category: ProductCategory;

  @ApiProperty({ description: 'Quantity handed over.', type: Number })
  quantity: number;

  @ApiProperty({
    description: 'Unit the quantity is counted in.',
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PACK,
  })
  unit: UnitOfMeasure;

  @ApiProperty({ description: 'Weight of this line.', type: Number })
  weightKg: number;

  @ApiPropertyOptional({
    description: 'Retail value of this whole line.',
    type: Number,
    nullable: true,
  })
  retailValue: number | null;

  @ApiPropertyOptional({
    description: 'Retail value of a single unit, snapshotted from the lot.',
    type: Number,
    nullable: true,
    example: 1.25,
  })
  unitPrice: number | null;

  @ApiPropertyOptional({
    description: 'How the unit was named on the lot.',
    nullable: true,
    example: 'bottles',
  })
  unitLabel: string | null;

  @ApiPropertyOptional({
    description: 'Image snapshotted from the lot or the catalogue.',
    nullable: true,
  })
  imageUrl: string | null;

  @ApiPropertyOptional({
    description: 'Expiry snapshotted from the lot (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  expiresAt: string | null;

  @ApiPropertyOptional({
    description: 'Hours until expiry, derived rather than stored.',
    type: Number,
    nullable: true,
    example: 4.5,
  })
  hoursRemaining: number | null;

  @ApiPropertyOptional({
    description: 'Whole days until expiry, derived.',
    type: Number,
    nullable: true,
    example: 1,
  })
  daysRemaining: number | null;

  @ApiPropertyOptional({
    description: 'Urgency band, derived from the hours remaining.',
    enum: SurplusUrgency,
    enumName: 'SurplusUrgency',
    nullable: true,
    example: SurplusUrgency.CRITICAL,
  })
  urgency: SurplusUrgency | null;

  @ApiProperty({
    description: 'Why the line was donatable.',
    enum: DonationReason,
    enumName: 'DonationReason',
    example: DonationReason.NEAR_EXPIRY,
  })
  reason: DonationReason;

  @ApiPropertyOptional({ description: 'Condition notes.', nullable: true })
  reasonDescription: string | null;

  /**
   * Maps a DonationLine entity onto its API representation.
   * @param data The DonationLine entity loaded from the database.
   */
  constructor(data: DonationLine) {
    this.id = data.id;
    this.inventoryItemId = data.inventoryItemId;
    this.productName = data.productName;
    this.brand = data.brand;
    this.barcode = data.barcode;
    this.category = data.category;
    this.quantity = data.quantity;
    this.unit = data.unit;
    this.weightKg = data.weightKg;
    this.retailValue = data.retailValue;
    this.unitPrice = data.unitPrice;
    this.unitLabel = data.unitLabel;
    this.imageUrl = data.imageUrl;
    this.expiresAt = data.expiresAt ? data.expiresAt.toISOString() : null;

    const expiry = expiryView(data.expiresAt);

    this.hoursRemaining = expiry.hoursRemaining;
    this.daysRemaining = expiry.daysRemaining;
    this.urgency = expiry.urgency;
    this.reason = data.reason;
    this.reasonDescription = data.reasonDescription;
  }
}
