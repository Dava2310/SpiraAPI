import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Matches, Max, Min } from 'class-validator';

import type { OpeningHours } from '../entities/opening-hours.interface.js';

/** Input for one day's public opening hours. */
export class OpeningHoursDto implements OpeningHours {
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
    description: 'Local opening time in `HH:mm` (24h).',
    example: '08:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'The opening time must use the 24-hour format HH:mm.',
  })
  opensAt: string;

  @ApiProperty({
    description: 'Local closing time in `HH:mm` (24h).',
    example: '22:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'The closing time must use the 24-hour format HH:mm.',
  })
  closesAt: string;
}
