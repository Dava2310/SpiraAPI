import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DonationReason } from '../../common/enums/donation-reason.enum.js';
import {
  CRITICAL_HOURS_THRESHOLD,
  EXPIRING_HOURS_THRESHOLD,
  SurplusUrgency,
} from '../../common/enums/surplus-urgency.enum.js';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum.js';
import type { InventoryItem } from '../entities/inventory-item.entity.js';
import { InventoryItemStatus } from '../enums/inventory-item-status.enum.js';

const MS_PER_HOUR = 60 * 60 * 1000;
const HOURS_PER_DAY = 24;

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

  @ApiProperty({ description: 'Currency of the retail value.', example: 'EUR' })
  currency: string;

  @ApiPropertyOptional({
    description: 'When the lot expires (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  expiresAt: string | null;

  @ApiPropertyOptional({
    description:
      'Hours until expiry, derived rather than stored. Negative once past, null when there is no expiry.',
    type: Number,
    nullable: true,
    example: 4.5,
  })
  hoursRemaining: number | null;

  @ApiPropertyOptional({
    description:
      'Whole days until expiry, derived. Negative once past, null when there is no expiry.',
    type: Number,
    nullable: true,
    example: 1,
  })
  daysRemaining: number | null;

  @ApiPropertyOptional({
    description:
      'How pressing the lot is, derived from the hours remaining. Null when there is no expiry.',
    enum: SurplusUrgency,
    enumName: 'SurplusUrgency',
    nullable: true,
    example: SurplusUrgency.CRITICAL,
  })
  urgency: SurplusUrgency | null;

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
    this.expiresAt = data.expiresAt ? data.expiresAt.toISOString() : null;
    this.hoursRemaining = InventoryItemResponseDto.hoursUntil(data.expiresAt);
    this.daysRemaining =
      this.hoursRemaining === null
        ? null
        : Math.floor(this.hoursRemaining / HOURS_PER_DAY);
    this.urgency = InventoryItemResponseDto.urgencyOf(this.hoursRemaining);
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
   * Counts hours from now until an expiry instant, to one decimal place.
   * @param expiresAt The stored expiry, or null.
   * @returns Hours remaining, negative once past, or null without an expiry.
   */
  private static hoursUntil(expiresAt: Date | null): number | null {
    if (!expiresAt) {
      return null;
    }

    return (
      Math.round(((expiresAt.getTime() - Date.now()) / MS_PER_HOUR) * 10) / 10
    );
  }

  /**
   * Buckets hours remaining into the urgency the apps colour-code on.
   * @param hoursRemaining Hours until expiry, or null.
   * @returns The urgency band, or null without an expiry.
   */
  private static urgencyOf(
    hoursRemaining: number | null,
  ): SurplusUrgency | null {
    if (hoursRemaining === null) {
      return null;
    }

    if (hoursRemaining < CRITICAL_HOURS_THRESHOLD) {
      return SurplusUrgency.CRITICAL;
    }

    if (hoursRemaining < EXPIRING_HOURS_THRESHOLD) {
      return SurplusUrgency.EXPIRING;
    }

    return SurplusUrgency.STANDARD;
  }
}
