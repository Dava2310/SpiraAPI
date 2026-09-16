import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import type { PickupWindow } from '../entities/pickup-window.interface.js';

/** Input for one recurring availability slot on a location. */
export class PickupWindowDto implements PickupWindow {
  @ApiProperty({
    description: 'ISO-8601 weekday: 1 = Monday … 7 = Sunday.',
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsInt({ message: 'The weekday must be an integer.' })
  @Min(1, { message: 'The weekday must be between 1 (Monday) and 7 (Sunday).' })
  @Max(7, { message: 'The weekday must be between 1 (Monday) and 7 (Sunday).' })
  weekday: number;

  @ApiProperty({
    description: 'Local start time in `HH:mm` (24h).',
    example: '18:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'The start time must use the 24-hour format HH:mm.',
  })
  startTime: string;

  @ApiProperty({
    description: 'Local end time in `HH:mm` (24h).',
    example: '20:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'The end time must use the 24-hour format HH:mm.',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Free-text qualifier.',
    example: 'after closing',
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'The note must be a string.' })
  @MaxLength(120, { message: 'The note cannot be longer than 120 characters.' })
  note?: string;
}
