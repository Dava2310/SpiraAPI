import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { pickupWindowLabel } from '../../common/pickup/pickup-window.view.js';
import { RecipientType } from '../../recipients/enums/recipient-type.enum.js';
import type { Donation } from '../entities/donation.entity.js';
import { CancellationReasonCode } from '../enums/cancellation-reason-code.enum.js';
import { DonationOrigin } from '../enums/donation-origin.enum.js';
import { DonationStatus } from '../enums/donation-status.enum.js';
import { DonationLineResponseDto } from './donation-line-response.dto.js';

/**
 * The receiving organization, flattened onto the donation.
 *
 * The retailer's queue lists who is collecting, so a bare `recipientId` forced one
 * extra request per row. Mirrors how a lot carries its product.
 */
export class DonationRecipientDto {
  @ApiProperty({ description: 'The receiving organization.', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Name to show.',
    example: 'Banc dels Aliments',
  })
  displayName: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Abbreviated name, for tight rows.',
    nullable: true,
  })
  shortName: string | null;

  @ApiProperty({
    description: 'What kind of organization it is.',
    enum: RecipientType,
    enumName: 'RecipientType',
  })
  type: RecipientType;

  @ApiProperty({ description: 'Whether an admin has verified it.' })
  isVerified: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Logo, when one was uploaded.',
    nullable: true,
  })
  logoUrl: string | null;

  constructor(init: DonationRecipientDto) {
    this.id = init.id;
    this.displayName = init.displayName;
    this.shortName = init.shortName;
    this.type = init.type;
    this.isVerified = init.isVerified;
    this.logoUrl = init.logoUrl;
  }
}

/** The vehicle assigned to collect, when the recipient has named one. */
export class DonationVehicleDto {
  @ApiProperty({ description: 'The vehicle.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Registration plate.', example: '1234 ABC' })
  plate: string;

  @ApiPropertyOptional({
    type: String,
    description: 'How the driver describes it, for recognising it on arrival.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: 'Whether it is refrigerated.' })
  isRefrigerated: boolean;

  constructor(init: DonationVehicleDto) {
    this.id = init.id;
    this.plate = init.plate;
    this.description = init.description;
    this.isRefrigerated = init.isRefrigerated;
  }
}

/** The person collecting, so the branch knows who to expect. */
export class DonationDriverDto {
  @ApiProperty({ description: 'The driver contact.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Name to ask for.', example: 'Jordi Puig' })
  fullName: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Phone to call on arrival.',
    nullable: true,
  })
  phone: string | null;

  constructor(init: DonationDriverDto) {
    this.id = init.id;
    this.fullName = init.fullName;
    this.phone = init.phone;
  }
}

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

  @ApiProperty({
    description:
      'Which side started it. A `RECIPIENT_CLAIM` skips the offer/accept exchange.',
    enum: DonationOrigin,
    enumName: 'DonationOrigin',
    example: DonationOrigin.RETAILER_OFFER,
  })
  origin: DonationOrigin;

  @ApiPropertyOptional({
    type: String,
    description: 'Vehicle that will collect.',
    format: 'uuid',
    nullable: true,
  })
  recipientVehicleId: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Person who will collect.',
    format: 'uuid',
    nullable: true,
  })
  driverContactId: string | null;

  @ApiPropertyOptional({
    type: String,
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
    type: String,
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
    type: String,
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
    type: String,
    description: 'Named branch slot the window was reserved against.',
    format: 'uuid',
    nullable: true,
  })
  pickupSlotId: string | null;

  @ApiPropertyOptional({
    type: String,
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
    type: String,
    description: 'Why it was called off.',
    nullable: true,
  })
  cancellationReason: string | null;

  @ApiProperty({ description: 'Number of lines.', type: Number, example: 3 })
  lineCount: number;

  @ApiProperty({
    description: 'Total units across every line.',
    type: Number,
    example: 42,
  })
  totalQuantity: number;

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

  @ApiProperty({ description: 'Currency of the totals.', example: 'EUR' })
  currency: string;

  @ApiPropertyOptional({
    description:
      'Meals this donation represents. Pinned when the donation is claimed or delivered.',
    type: Number,
    nullable: true,
    example: 45.75,
  })
  estimatedMeals: number | null;

  @ApiPropertyOptional({
    description: 'CO₂-equivalent emissions avoided, in kilograms.',
    type: Number,
    nullable: true,
    example: 36.6,
  })
  co2AvoidedKg: number | null;

  @ApiPropertyOptional({
    type: String,
    description: 'The factor row the two figures above were computed from.',
    format: 'uuid',
    nullable: true,
  })
  impactFactorId: string | null;

  @ApiPropertyOptional({
    description: 'Cancellation reason as a fixed code.',
    enum: CancellationReasonCode,
    enumName: 'CancellationReasonCode',
    nullable: true,
  })
  cancellationReasonCode: CancellationReasonCode | null;

  @ApiPropertyOptional({
    type: String,
    description: 'User who cancelled, whichever side they belong to.',
    format: 'uuid',
    nullable: true,
  })
  cancelledByUserId: string | null;

  @ApiPropertyOptional({
    description: 'The receiving organization, when the relation was loaded.',
    type: DonationRecipientDto,
    nullable: true,
  })
  recipient: DonationRecipientDto | null;

  @ApiPropertyOptional({
    description: 'The collecting vehicle, when one is assigned and loaded.',
    type: DonationVehicleDto,
    nullable: true,
  })
  vehicle: DonationVehicleDto | null;

  @ApiPropertyOptional({
    description: 'The driver collecting, when one is named and loaded.',
    type: DonationDriverDto,
    nullable: true,
  })
  driver: DonationDriverDto | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Label of the branch collected from, when it was loaded.',
    nullable: true,
  })
  locationLabel: string | null;

  @ApiPropertyOptional({
    type: String,
    description:
      'The collection window in the branch\'s own timezone, such as `Today, 18:00 - 20:00`. Null until a window is agreed, or when the branch was not loaded.',
    nullable: true,
    example: 'Today, 18:00 - 20:00',
  })
  pickupWindowLabel: string | null;

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
    this.origin = data.origin;
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
    this.totalQuantity = data.totalQuantity;
    this.totalWeightKg = data.totalWeightKg;
    this.totalRetailValue = data.totalRetailValue;
    this.currency = data.currency;
    this.estimatedMeals = data.estimatedMeals;
    this.co2AvoidedKg = data.co2AvoidedKg;
    this.impactFactorId = data.impactFactorId;
    this.cancellationReasonCode = data.cancellationReasonCode;
    this.cancelledByUserId = data.cancelledByUserId;
    this.recipient = data.recipient
      ? new DonationRecipientDto({
          id: data.recipient.id,
          displayName: data.recipient.displayName,
          shortName: data.recipient.shortName,
          type: data.recipient.type,
          isVerified: data.recipient.verifiedAt != null,
          logoUrl: data.recipient.logoUrl,
        })
      : null;
    this.vehicle = data.recipientVehicle
      ? new DonationVehicleDto({
          id: data.recipientVehicle.id,
          plate: data.recipientVehicle.plate,
          description: data.recipientVehicle.description,
          isRefrigerated: data.recipientVehicle.isRefrigerated,
        })
      : null;
    this.driver = data.driverContact
      ? new DonationDriverDto({
          id: data.driverContact.id,
          fullName: data.driverContact.fullName,
          phone: data.driverContact.phone,
        })
      : null;
    this.locationLabel = data.location?.label ?? null;
    // Rendered in the branch's timezone: a window is a local opening time, and the
    // retailer reading it is standing in that branch.
    this.pickupWindowLabel = data.location
      ? pickupWindowLabel(
          data.pickupWindowStart,
          data.pickupWindowEnd,
          data.location.timezone,
        )
      : null;
    this.lines = data.lines?.map((line) => new DonationLineResponseDto(line));
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
