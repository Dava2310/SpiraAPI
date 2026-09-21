import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DonationReason } from '../../common/enums/donation-reason.enum.js';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum.js';
import type { InventoryItem } from '../entities/inventory-item.entity.js';
import { InventoryItemStatus } from '../enums/inventory-item-status.enum.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** API representation of a donatable stock lot. */
export class InventoryItemResponseDto {
  @ApiProperty({ description: 'Unique lot ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Branch holding the stock.', format: 'uuid' })
  locationId: string;

  @ApiProperty({ description: 'What the lot contains.', format: 'uuid' })
  productId: string;

  @ApiProperty({ description: 'How much there is.', type: Number, example: 4 })
  quantity: number;

  @ApiProperty({
    description: 'Unit the quantity is counted in.',
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PACK,
  })
  unit: UnitOfMeasure;

  @ApiProperty({
    description: 'Weight of the whole lot.',
    type: Number,
    example: 6,
  })
  weightKg: number;

  @ApiPropertyOptional({
    description: 'Retail value of the whole lot.',
    type: Number,
    nullable: true,
  })
  retailValue: number | null;

  @ApiProperty({ description: 'Currency of the retail value.', example: 'USD' })
  currency: string;

  @ApiPropertyOptional({
    description: 'Best-by date.',
    type: String,
    format: 'date',
    nullable: true,
  })
  expiryDate: string | null;

  @ApiPropertyOptional({
    description:
      'Whole days until the best-by date, derived from `expiryDate` rather than stored. Negative once past, null when there is no expiry.',
    type: Number,
    nullable: true,
    example: 1,
  })
  daysRemaining: number | null;

  @ApiProperty({
    description: 'Why the lot is donatable.',
    enum: DonationReason,
    enumName: 'DonationReason',
    example: DonationReason.NEAR_EXPIRY,
  })
  reason: DonationReason;

  @ApiPropertyOptional({ description: 'Condition notes.', nullable: true })
  reasonDescription: string | null;

  @ApiProperty({
    description: 'Lifecycle state.',
    enum: InventoryItemStatus,
    enumName: 'InventoryItemStatus',
    example: InventoryItemStatus.IN_INVENTORY,
  })
  status: InventoryItemStatus;

  @ApiPropertyOptional({
    description: 'Donation this lot is committed to.',
    format: 'uuid',
    nullable: true,
  })
  donationId: string | null;

  @ApiProperty({
    description: 'When the lot was logged (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  listedAt: string;

  @ApiPropertyOptional({
    description: 'When the lot was added to a donation (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  queuedAt: string | null;

  @ApiProperty({
    description: 'When the lot was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the lot was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps an InventoryItem entity onto its API representation, deriving
   * `daysRemaining` from the stored expiry date.
   * @param data The InventoryItem entity loaded from the database.
   */
  constructor(data: InventoryItem) {
    this.id = data.id;
    this.locationId = data.locationId;
    this.productId = data.productId;
    this.quantity = data.quantity;
    this.unit = data.unit;
    this.weightKg = data.weightKg;
    this.retailValue = data.retailValue;
    this.currency = data.currency;
    this.expiryDate = data.expiryDate;
    this.daysRemaining = InventoryItemResponseDto.daysUntil(data.expiryDate);
    this.reason = data.reason;
    this.reasonDescription = data.reasonDescription;
    this.status = data.status;
    this.donationId = data.donationId;
    this.listedAt = data.listedAt.toISOString();
    this.queuedAt = data.queuedAt ? data.queuedAt.toISOString() : null;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }

  /**
   * Counts whole days from today to a calendar date, comparing at UTC midnight
   * so the result does not shift with the time of day.
   * @param expiryDate The stored `YYYY-MM-DD` date, or null.
   * @returns Whole days remaining, negative once past, or null without a date.
   */
  private static daysUntil(expiryDate: string | null): number | null {
    if (!expiryDate) {
      return null;
    }

    const expiry = Date.parse(`${expiryDate}T00:00:00Z`);

    if (Number.isNaN(expiry)) {
      return null;
    }

    const today = new Date();
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );

    return Math.round((expiry - todayUtc) / MS_PER_DAY);
  }
}
