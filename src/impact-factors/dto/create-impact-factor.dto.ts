import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Input for publishing a set of impact conversion factors. */
export class CreateImpactFactorDto {
  @ApiProperty({
    description: 'Identifier for this set of factors.',
    example: 'default-2026',
    maxLength: 60,
  })
  @IsNotEmpty({ message: 'The label cannot be empty.' })
  @IsString({ message: 'The label must be a string.' })
  @MaxLength(60, { message: 'The label cannot be longer than 60 characters.' })
  label: string;

  @ApiProperty({
    description: 'Meals one kilogram of rescued food is reckoned to provide.',
    example: 2.5,
    minimum: 0,
    maximum: 999.999,
  })
  @IsNumber(
    { maxDecimalPlaces: 3 },
    {
      message:
        'The meals per kilogram must be a number with at most 3 decimal places.',
    },
  )
  @Min(0, { message: 'The meals per kilogram cannot be negative.' })
  @Max(999.999, { message: 'The meals per kilogram cannot exceed 999.999.' })
  mealsPerKg: number;

  @ApiProperty({
    description: 'Kilograms of CO2 avoided per kilogram of rescued food.',
    example: 2,
    minimum: 0,
    maximum: 999.999,
  })
  @IsNumber(
    { maxDecimalPlaces: 3 },
    {
      message:
        'The CO2 per kilogram must be a number with at most 3 decimal places.',
    },
  )
  @Min(0, { message: 'The CO2 per kilogram cannot be negative.' })
  @Max(999.999, { message: 'The CO2 per kilogram cannot exceed 999.999.' })
  co2KgPerKg: number;

  @ApiProperty({
    description: 'First day these factors apply.',
    format: 'date',
    example: '2026-01-01',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'The effective-from date must use the format YYYY-MM-DD.',
  })
  effectiveFrom: string;

  @ApiPropertyOptional({
    description: 'Last day these factors apply. Omit while they are current.',
    format: 'date',
    example: '2026-12-31',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'The effective-to date must use the format YYYY-MM-DD.',
  })
  effectiveTo?: string;
}
