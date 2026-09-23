import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { SurplusUrgency } from '../../common/enums/surplus-urgency.enum.js';

/** What is staged and ready to hand over right now. */
export class ReadyToDonateDto {
  @ApiProperty({
    description: 'Lots staged across open donations.',
    type: Number,
  })
  lineCount: number;

  @ApiProperty({ description: 'Their combined weight.', type: Number })
  totalWeightKg: number;

  @ApiProperty({ description: 'Meals that weight represents.', type: Number })
  estimatedMeals: number;

  constructor(init: ReadyToDonateDto) {
    this.lineCount = init.lineCount;
    this.totalWeightKg = init.totalWeightKg;
    this.estimatedMeals = init.estimatedMeals;
  }
}

/** The next collection due at this branch. */
export class NextPickupDto {
  @ApiProperty({ description: 'The donation being collected.', format: 'uuid' })
  donationId: string;

  @ApiProperty({ description: 'Reference shown to both parties.' })
  code: string;

  @ApiProperty({ description: 'Who is collecting.' })
  recipientName: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Named contact on the collecting side.',
    nullable: true,
  })
  contactPerson: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Plate of the collecting vehicle.',
    nullable: true,
  })
  vehiclePlate: string | null;

  @ApiPropertyOptional({
    description: 'Start of the agreed window (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  pickupWindowStart: string | null;

  @ApiPropertyOptional({
    description: 'End of the agreed window (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  pickupWindowEnd: string | null;

  @ApiPropertyOptional({
    description:
      'Minutes until the window opens, negative once it has. Null without a window.',
    type: Number,
    nullable: true,
  })
  minutesUntilWindow: number | null;

  constructor(init: NextPickupDto) {
    this.donationId = init.donationId;
    this.code = init.code;
    this.recipientName = init.recipientName;
    this.contactPerson = init.contactPerson;
    this.vehiclePlate = init.vehiclePlate;
    this.pickupWindowStart = init.pickupWindowStart;
    this.pickupWindowEnd = init.pickupWindowEnd;
    this.minutesUntilWindow = init.minutesUntilWindow;
  }
}

/**
 * The retailer home screen in one call.
 *
 * The app rendered each of these from its own client-side scan of the full
 * inventory and donation lists, which is why its counters disagreed with each
 * other. Every figure here comes from one place.
 */
export class RetailerDashboardResponseDto {
  @ApiProperty({
    description: 'Staged and awaiting collection.',
    type: ReadyToDonateDto,
  })
  ready: ReadyToDonateDto;

  @ApiPropertyOptional({
    description: 'The next collection due, or null when nothing is scheduled.',
    type: NextPickupDto,
    nullable: true,
  })
  nextPickup: NextPickupDto | null;

  @ApiProperty({
    description: 'Lots expiring within the urgency window.',
    type: Number,
  })
  urgentCount: number;

  @ApiProperty({
    description: 'The most pressing urgency present in stock.',
    enum: SurplusUrgency,
    enumName: 'SurplusUrgency',
    nullable: true,
  })
  highestUrgency: SurplusUrgency | null;

  @ApiProperty({
    description: 'Donations delivered from this branch, all time.',
    type: Number,
  })
  deliveredCount: number;

  @ApiProperty({ description: 'Lots currently in inventory.', type: Number })
  inventoryCount: number;

  constructor(init: RetailerDashboardResponseDto) {
    this.ready = init.ready;
    this.nextPickup = init.nextPickup;
    this.urgentCount = init.urgentCount;
    this.highestUrgency = init.highestUrgency;
    this.deliveredCount = init.deliveredCount;
    this.inventoryCount = init.inventoryCount;
  }
}
