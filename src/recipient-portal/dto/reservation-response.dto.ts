import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DonationLineResponseDto } from '../../donations/dto/donation-line-response.dto.js';
import { PickupTokenResponseDto } from '../../donations/dto/pickup-token-response.dto.js';
import { DonationStatus } from '../../donations/enums/donation-status.enum.js';

/** Where a reservation falls relative to the recipient's own day. */
export enum ReservationWindow {
  TODAY = 'today',
  UPCOMING = 'upcoming',
  PAST = 'past',
}

/**
 * A reservation as the NGO app's pass and list rows need it.
 *
 * `window` is resolved server-side in the recipient's timezone. The app grouped
 * by grepping a prose string, which filed an "Instant AI Rescue Window" label
 * under neither today nor upcoming.
 */
export class ReservationResponseDto {
  @ApiProperty({
    description: 'The donation behind the reservation.',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ description: 'Reference shown to both parties.' })
  code: string;

  @ApiProperty({
    description: 'Lifecycle state.',
    enum: DonationStatus,
    enumName: 'DonationStatus',
  })
  status: DonationStatus;

  @ApiProperty({ description: 'The store collected from.', format: 'uuid' })
  locationId: string;

  @ApiProperty({ description: 'Store name.', example: 'Mercadona Eixample' })
  locationLabel: string;

  @ApiProperty({ description: 'Street address of the store.' })
  locationAddress: string;

  @ApiPropertyOptional({
    type: String,
    description: 'District or neighbourhood.',
    nullable: true,
  })
  neighborhood: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Arrival notes for the driver.',
    nullable: true,
  })
  accessInstructions: string | null;

  @ApiProperty({ description: 'Retailer brand.', example: 'Mercadona' })
  retailerName: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Retailer logo.',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Name of the store contact to ask for.',
    nullable: true,
  })
  storeContactName: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Phone of the store.',
    nullable: true,
  })
  storePhone: string | null;

  @ApiPropertyOptional({
    description: 'Start of the collection window (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  pickupWindowStart: string | null;

  @ApiPropertyOptional({
    description: 'End of the collection window (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  pickupWindowEnd: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'The window as one label, in the recipient’s timezone.',
    nullable: true,
    example: 'Today, 18:30 - 20:00',
  })
  pickupWindowLabel: string | null;

  @ApiProperty({
    description: 'Which bucket the reservation belongs in.',
    enum: ReservationWindow,
    enumName: 'ReservationWindow',
  })
  window: ReservationWindow;

  @ApiProperty({ description: 'Lots reserved.', type: Number })
  lineCount: number;

  @ApiProperty({ description: 'Units reserved.', type: Number })
  totalQuantity: number;

  @ApiProperty({ description: 'Weight reserved.', type: Number })
  totalWeightKg: number;

  @ApiProperty({ description: 'Retail value reserved.', type: Number })
  totalRetailValue: number;

  @ApiProperty({ description: 'Currency of the value.', example: 'EUR' })
  currency: string;

  @ApiPropertyOptional({
    description: 'Meals the reservation represents.',
    type: Number,
    nullable: true,
  })
  estimatedMeals: number | null;

  @ApiPropertyOptional({
    description: 'CO₂-equivalent avoided, in kilograms.',
    type: Number,
    nullable: true,
  })
  co2AvoidedKg: number | null;

  @ApiPropertyOptional({
    description: 'The lots, when the lines were loaded.',
    type: [DonationLineResponseDto],
  })
  lines?: DonationLineResponseDto[];

  @ApiPropertyOptional({
    description:
      'The pass to present at the store, when a token is outstanding. Carries both the QR payload and the PIN.',
    type: PickupTokenResponseDto,
    nullable: true,
  })
  pickupToken: PickupTokenResponseDto | null;

  @ApiProperty({
    description: 'When the reservation was made (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  constructor(init: ReservationResponseDto) {
    Object.assign(this, init);
  }
}

/** Counts for the nav badge and the two list buckets. */
export class ReservationCountsDto {
  @ApiProperty({
    description:
      'Reservations still to collect. Defined once here, as anything accepted through en route — a delivered pass is not active.',
    type: Number,
  })
  active: number;

  @ApiProperty({ description: 'Active reservations due today.', type: Number })
  today: number;

  @ApiProperty({ description: 'Active reservations due later.', type: Number })
  upcoming: number;

  constructor(init: ReservationCountsDto) {
    this.active = init.active;
    this.today = init.today;
    this.upcoming = init.upcoming;
  }
}
