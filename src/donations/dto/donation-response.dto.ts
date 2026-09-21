import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Donation } from '../entities/donation.entity.js';
import { DonationStatus } from '../enums/donation-status.enum.js';
import { DonationLineResponseDto } from './donation-line-response.dto.js';

/** API representation of a donation. */
export class DonationResponseDto {
  @ApiProperty({ description: 'Unique donation ID.', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Human-readable reference.',
    example: 'FR-2026-000402',
  })
  code: string;

  @ApiProperty({ description: 'Donating retailer.', format: 'uuid' })
  retailerId: string;

  @ApiProperty({ description: 'Branch collected from.', format: 'uuid' })
  locationId: string;

  @ApiProperty({ description: 'Receiving recipient.', format: 'uuid' })
  recipientId: string;

  @ApiProperty({
    description: 'Lifecycle state.',
    enum: DonationStatus,
    enumName: 'DonationStatus',
    example: DonationStatus.OFFERED,
  })
  status: DonationStatus;

  @ApiPropertyOptional({
    description: 'Vehicle that will collect.',
    format: 'uuid',
    nullable: true,
  })
  recipientVehicleId: string | null;

  @ApiPropertyOptional({
    description: 'Person who will collect.',
    format: 'uuid',
    nullable: true,
  })
  driverContactId: string | null;

  @ApiPropertyOptional({
    description: 'Retailer-side user who created it.',
    format: 'uuid',
    nullable: true,
  })
  createdByUserId: string | null;

  @ApiPropertyOptional({
    description: 'When it was offered to the recipient (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  offeredAt: string | null;

  @ApiPropertyOptional({
    description: 'Recipient-side user who accepted.',
    format: 'uuid',
    nullable: true,
  })
  acceptedByUserId: string | null;

  @ApiPropertyOptional({
    description: 'When the recipient accepted (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  acceptedAt: string | null;

  @ApiPropertyOptional({
    description: 'When the recipient declined (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  declinedAt: string | null;

  @ApiPropertyOptional({
    description: 'Why the recipient declined.',
    nullable: true,
  })
  declineReason: string | null;

  @ApiPropertyOptional({
    description: 'Start of the agreed collection window (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  pickupWindowStart: string | null;

  @ApiPropertyOptional({
    description: 'End of the agreed collection window (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  pickupWindowEnd: string | null;

  @ApiPropertyOptional({
    description: 'Named branch slot the window was reserved against.',
    format: 'uuid',
    nullable: true,
  })
  pickupSlotId: string | null;

  @ApiPropertyOptional({
    description: 'Retailer-side user who confirmed the handover.',
    format: 'uuid',
    nullable: true,
  })
  confirmedByUserId: string | null;

  @ApiPropertyOptional({
    description: 'When the handover completed (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  completedAt: string | null;

  @ApiPropertyOptional({
    description: 'When it was called off (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  cancelledAt: string | null;

  @ApiPropertyOptional({
    description: 'Why it was called off.',
    nullable: true,
  })
  cancellationReason: string | null;

  @ApiProperty({ description: 'Number of lines.', type: Number, example: 3 })
  lineCount: number;

  @ApiProperty({
    description: 'Total weight of every line.',
    type: Number,
    example: 18.3,
  })
  totalWeightKg: number;

  @ApiProperty({
    description: 'Total retail value of every line.',
    type: Number,
    example: 98,
  })
  totalRetailValue: number;

  @ApiProperty({ description: 'Currency of the totals.', example: 'USD' })
  currency: string;

  @ApiPropertyOptional({
    description: 'The lines, when they were loaded with the donation.',
    type: [DonationLineResponseDto],
  })
  lines?: DonationLineResponseDto[];

  @ApiProperty({
    description: 'When the donation was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the donation was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a Donation entity onto its API representation. The lines are included
   * only when the relation was loaded, so a list query stays cheap.
   * @param data The Donation entity loaded from the database.
   */
  constructor(data: Donation) {
    this.id = data.id;
    this.code = data.code;
    this.retailerId = data.retailerId;
    this.locationId = data.locationId;
    this.recipientId = data.recipientId;
    this.status = data.status;
    this.recipientVehicleId = data.recipientVehicleId;
    this.driverContactId = data.driverContactId;
    this.createdByUserId = data.createdByUserId;
    this.offeredAt = data.offeredAt ? data.offeredAt.toISOString() : null;
    this.acceptedByUserId = data.acceptedByUserId;
    this.acceptedAt = data.acceptedAt ? data.acceptedAt.toISOString() : null;
    this.declinedAt = data.declinedAt ? data.declinedAt.toISOString() : null;
    this.declineReason = data.declineReason;
    this.pickupWindowStart = data.pickupWindowStart
      ? data.pickupWindowStart.toISOString()
      : null;
    this.pickupWindowEnd = data.pickupWindowEnd
      ? data.pickupWindowEnd.toISOString()
      : null;
    this.pickupSlotId = data.pickupSlotId;
    this.confirmedByUserId = data.confirmedByUserId;
    this.completedAt = data.completedAt ? data.completedAt.toISOString() : null;
    this.cancelledAt = data.cancelledAt ? data.cancelledAt.toISOString() : null;
    this.cancellationReason = data.cancellationReason;
    this.lineCount = data.lineCount;
    this.totalWeightKg = data.totalWeightKg;
    this.totalRetailValue = data.totalRetailValue;
    this.currency = data.currency;
    this.lines = data.lines?.map((line) => new DonationLineResponseDto(line));
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
