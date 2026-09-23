import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LocationResponseDto } from '../../locations/dto/index.js';
import { RecipientResponseDto } from '../../recipients/dto/index.js';
import { RetailerResponseDto } from '../../retailers/dto/index.js';
import { UserRole } from '../../users/enums/user-role.enum.js';

/** Running impact totals for the caller's organization. */
export class ImpactSummaryDto {
  @ApiProperty({ description: 'Weight rescued, in kilograms.', type: Number })
  totalWeightKg: number;

  @ApiProperty({ description: 'Meals the weight represents.', type: Number })
  totalMeals: number;

  @ApiProperty({
    description: 'CO₂-equivalent emissions avoided, in kilograms.',
    type: Number,
  })
  totalCo2Kg: number;

  @ApiProperty({ description: 'Retail value rescued.', type: Number })
  totalRetailValue: number;

  @ApiProperty({ description: 'Currency of the value.', example: 'EUR' })
  currency: string;

  @ApiProperty({
    description: 'Number of delivered donations counted.',
    type: Number,
  })
  donationCount: number;

  @ApiProperty({
    description:
      'Distinct counterparties delivered with, whichever side the caller is on.',
    type: Number,
  })
  partnerCount: number;

  constructor(init: ImpactSummaryDto) {
    this.totalWeightKg = init.totalWeightKg;
    this.totalMeals = init.totalMeals;
    this.totalCo2Kg = init.totalCo2Kg;
    this.totalRetailValue = init.totalRetailValue;
    this.currency = init.currency;
    this.donationCount = init.donationCount;
    this.partnerCount = init.partnerCount;
  }
}

/**
 * Everything an app needs on sign-in: who the caller is, which organization
 * they act for, which branch is theirs, and their running impact.
 *
 * Both frontends assumed this context implicitly and hardcoded it. One call
 * replaces that, so neither app has to know how to assemble it.
 */
export class MeResponseDto {
  @ApiProperty({ description: 'Authenticated user ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Sign-in address.', example: 'ops@spira.app' })
  email: string;

  @ApiProperty({
    description: 'What the caller is allowed to do.',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.RETAILER,
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'The retailer the caller acts for, when they are a RETAILER.',
    type: RetailerResponseDto,
    nullable: true,
  })
  retailer: RetailerResponseDto | null;

  @ApiPropertyOptional({
    description:
      'The recipient the caller acts for, when they are a RECIPIENT. Carries the alert preferences.',
    type: RecipientResponseDto,
    nullable: true,
  })
  recipient: RecipientResponseDto | null;

  @ApiPropertyOptional({
    description:
      "The organization's primary branch, which the retailer app treats as the current store.",
    type: LocationResponseDto,
    nullable: true,
  })
  primaryLocation: LocationResponseDto | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Name of the primary contact, shown on the handover screens.',
    nullable: true,
    example: 'Marta Ruiz',
  })
  primaryContactName: string | null;

  @ApiProperty({
    description: 'Running impact totals for the organization.',
    type: ImpactSummaryDto,
  })
  impact: ImpactSummaryDto;

  constructor(init: MeResponseDto) {
    this.id = init.id;
    this.email = init.email;
    this.role = init.role;
    this.retailer = init.retailer;
    this.recipient = init.recipient;
    this.primaryLocation = init.primaryLocation;
    this.primaryContactName = init.primaryContactName;
    this.impact = init.impact;
  }
}
