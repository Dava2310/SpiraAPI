import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ImpactFactor } from '../entities/impact-factor.entity.js';

/** API representation of a set of impact conversion factors. */
export class ImpactFactorResponseDto {
  @ApiProperty({ description: 'Unique factor-set ID.', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Identifier for this set.',
    example: 'default-2026',
  })
  label: string;

  @ApiProperty({
    description: 'Meals per kilogram of rescued food.',
    type: Number,
    example: 2.5,
  })
  mealsPerKg: number;

  @ApiProperty({
    description: 'Kilograms of CO2 avoided per kilogram of rescued food.',
    type: Number,
    example: 2,
  })
  co2KgPerKg: number;

  @ApiProperty({
    description: 'First day these factors apply.',
    type: String,
    format: 'date',
  })
  effectiveFrom: string;

  @ApiPropertyOptional({
    description: 'Last day these factors apply. Null means current.',
    type: String,
    format: 'date',
    nullable: true,
  })
  effectiveTo: string | null;

  @ApiProperty({
    description: 'When the set was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the set was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps an ImpactFactor entity onto its API representation.
   * @param data The ImpactFactor entity loaded from the database.
   */
  constructor(data: ImpactFactor) {
    this.id = data.id;
    this.label = data.label;
    this.mealsPerKg = data.mealsPerKg;
    this.co2KgPerKg = data.co2KgPerKg;
    this.effectiveFrom = data.effectiveFrom;
    this.effectiveTo = data.effectiveTo;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
