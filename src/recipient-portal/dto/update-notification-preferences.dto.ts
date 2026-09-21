import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { UrgencyThreshold } from '../../recipients/enums/urgency-threshold.enum.js';

/** Input for the recipient's surplus alert preferences. */
export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'How far from their locations they will collect.',
    type: Number,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 1 },
    {
      message:
        'The alert radius must be a number with at most 1 decimal place.',
    },
  )
  @Min(1, { message: 'The alert radius must be at least 1 km.' })
  @Max(100, { message: 'The alert radius cannot exceed 100 km.' })
  alertRadiusKm?: number;

  @ApiPropertyOptional({
    description: 'Which urgencies are worth alerting them about.',
    enum: UrgencyThreshold,
    enumName: 'UrgencyThreshold',
  })
  @IsOptional()
  @IsEnum(UrgencyThreshold, {
    message: `The urgency threshold must be one of: ${Object.values(UrgencyThreshold).join(', ')}.`,
  })
  urgencyThreshold?: UrgencyThreshold;

  @ApiPropertyOptional({ description: 'Whether to send push notifications.' })
  @IsOptional()
  @IsBoolean({ message: 'The push notifications flag must be a boolean.' })
  pushNotificationsEnabled?: boolean;
}
