import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { DonationReason } from '../../common/enums/donation-reason.enum.js';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum.js';

/**
 * Input for logging a lot of stock as donatable.
 *
 * `status`, `donationId`, `listedAt` and `queuedAt` are absent on purpose: they
 * are lifecycle state the server owns, not something a caller sets.
 */
export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Branch holding the stock.', format: 'uuid' })
  @IsNotEmpty({ message: 'The location ID cannot be empty.' })
  @IsUUID('4', { message: 'The location ID must be a valid UUID.' })
  locationId: string;

  @ApiProperty({ description: 'What the lot contains.', format: 'uuid' })
  @IsNotEmpty({ message: 'The product ID cannot be empty.' })
  @IsUUID('4', { message: 'The product ID must be a valid UUID.' })
  productId: string;

  @ApiProperty({
    description: 'How much there is, counted in `unit`.',
    example: 4,
    minimum: 0.001,
  })
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'The quantity must be a number with at most 3 decimal places.' },
  )
  @Min(0.001, { message: 'The quantity must be greater than zero.' })
  @Max(9999999.999, { message: 'The quantity cannot exceed 9999999.999.' })
  quantity: number;

  @ApiProperty({
    description: 'Unit the quantity is counted in.',
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PACK,
  })
  @IsNotEmpty({ message: 'The unit cannot be empty.' })
  @IsEnum(UnitOfMeasure, {
    message: `The unit must be one of: ${Object.values(UnitOfMeasure).join(', ')}.`,
  })
  unit: UnitOfMeasure;

  @ApiProperty({
    description:
      'Weight of the whole lot. Given rather than derived, because pack weights vary.',
    example: 6,
    minimum: 0,
  })
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'The weight must be a number with at most 3 decimal places.' },
  )
  @Min(0, { message: 'The weight cannot be negative.' })
  @Max(9999999.999, { message: 'The weight cannot exceed 9999999.999.' })
  weightKg: number;

  @ApiPropertyOptional({
    description: 'Retail value of the whole lot, not of one unit.',
    example: 28,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'The retail value must be a number with at most 2 decimal places.',
    },
  )
  @Min(0, { message: 'The retail value cannot be negative.' })
  @Max(99999999.99, { message: 'The retail value cannot exceed 99999999.99.' })
  retailValue?: number;

  @ApiPropertyOptional({
    description: 'Currency of the retail value, as an ISO 4217 code.',
    default: 'USD',
    example: 'USD',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsISO4217CurrencyCode({
    message: 'The currency must be a valid ISO 4217 code, for example USD.',
  })
  currency?: string;

  @ApiPropertyOptional({
    description:
      'Best-by date. Omit for non-perishables. Days remaining is derived from this.',
    format: 'date',
    example: '2026-09-18',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'The expiry date must use the format YYYY-MM-DD.',
  })
  expiryDate?: string;

  @ApiProperty({
    description: 'Why the lot is donatable rather than sellable.',
    enum: DonationReason,
    enumName: 'DonationReason',
    example: DonationReason.NEAR_EXPIRY,
  })
  @IsNotEmpty({ message: 'The reason cannot be empty.' })
  @IsEnum(DonationReason, {
    message: `The reason must be one of: ${Object.values(DonationReason).join(', ')}.`,
  })
  reason: DonationReason;

  @ApiPropertyOptional({
    description:
      'Condition notes for the recipient, reproduced on the donation certificate.',
    example:
      '24 hours remaining before the best-by date. Kept in unbroken cold chain storage.',
  })
  @IsOptional()
  @IsString({ message: 'The reason description must be a string.' })
  reasonDescription?: string;
}
