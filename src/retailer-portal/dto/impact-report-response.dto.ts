import { ApiProperty } from '@nestjs/swagger';

/** The impact factors a report was computed with, so a reader can check it. */
export class ImpactFactorSummaryDto {
  @ApiProperty({
    description: 'Meals per kilogram.',
    type: Number,
    example: 2.5,
  })
  mealsPerKg: number;

  @ApiProperty({
    description: 'CO₂-equivalent kilograms avoided per kilogram.',
    type: Number,
    example: 2,
  })
  co2KgPerKg: number;

  constructor(init: ImpactFactorSummaryDto) {
    this.mealsPerKg = init.mealsPerKg;
    this.co2KgPerKg = init.co2KgPerKg;
  }
}

/**
 * A period-scoped impact report.
 *
 * `period` is explicit because both apps labelled a lifetime total as an annual
 * or monthly report. An unlabelled total is the bug, not the number.
 */
export class ImpactReportResponseDto {
  @ApiProperty({
    description: 'The period covered, as given: `2026` or `2026-09`.',
    example: '2026',
  })
  period: string;

  @ApiProperty({
    description: 'Human-readable form of the period.',
    example: '2026 Annual Report',
  })
  periodLabel: string;

  @ApiProperty({ description: 'Weight rescued, in kilograms.', type: Number })
  totalWeightKg: number;

  @ApiProperty({ description: 'Meals that weight represents.', type: Number })
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

  @ApiProperty({ description: 'Donations delivered.', type: Number })
  donationCount: number;

  @ApiProperty({
    description: 'Distinct counterparties delivered with.',
    type: Number,
  })
  partnerCount: number;

  @ApiProperty({
    description: 'The factors in force for the period.',
    type: ImpactFactorSummaryDto,
  })
  impactFactor: ImpactFactorSummaryDto;

  constructor(init: ImpactReportResponseDto) {
    this.period = init.period;
    this.periodLabel = init.periodLabel;
    this.totalWeightKg = init.totalWeightKg;
    this.totalMeals = init.totalMeals;
    this.totalCo2Kg = init.totalCo2Kg;
    this.totalRetailValue = init.totalRetailValue;
    this.currency = init.currency;
    this.donationCount = init.donationCount;
    this.partnerCount = init.partnerCount;
    this.impactFactor = init.impactFactor;
  }
}
