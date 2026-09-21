import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';

/**
 * Conversion factors turning rescued weight into reportable impact.
 *
 * Reference data rather than constants in code, so the figures can be revised
 * without rewriting the certificates that already quoted the old ones — each
 * receipt records which row it used.
 */
@Entity('impact_factor')
@Index('idx_impact_factor_effective', ['effectiveFrom'], {
  where: 'deleted_at IS NULL',
})
export class ImpactFactor extends SoftDeletableEntity {
  @ApiProperty({
    description: 'Identifier for this set of factors.',
    maxLength: 60,
    example: 'default-2026',
  })
  @Column({ name: 'label', type: 'varchar', length: 60 })
  label: string;

  @ApiProperty({
    description: 'Meals one kilogram of rescued food is reckoned to provide.',
    type: Number,
    example: 2.5,
  })
  @Column({
    name: 'meals_per_kg',
    type: 'numeric',
    precision: 6,
    scale: 3,
    transformer: numericTransformer,
  })
  mealsPerKg: number;

  @ApiProperty({
    description: 'Kilograms of CO2 avoided per kilogram of rescued food.',
    type: Number,
    example: 2,
  })
  @Column({
    name: 'co2_kg_per_kg',
    type: 'numeric',
    precision: 6,
    scale: 3,
    transformer: numericTransformer,
  })
  co2KgPerKg: number;

  @ApiProperty({
    description: 'First day these factors apply.',
    type: String,
    format: 'date',
    example: '2026-01-01',
  })
  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @ApiPropertyOptional({
    description: 'Last day these factors apply. Null means current.',
    type: String,
    format: 'date',
    nullable: true,
  })
  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: string | null;
}
