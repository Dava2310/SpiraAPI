import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CancellationReasonCode } from '../enums/cancellation-reason-code.enum.js';

/** Input for either side calling off a donation, including a driver no-show. */
export class CancelDonationDto {
  @ApiProperty({
    description: 'Why the donation was called off.',
    example: 'Driver did not arrive within the pickup window.',
    minLength: 3,
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'The cancellation reason cannot be empty.' })
  @IsString({ message: 'The cancellation reason must be a string.' })
  @MinLength(3, {
    message: 'The cancellation reason must be at least 3 characters long.',
  })
  @MaxLength(500, {
    message: 'The cancellation reason cannot be longer than 500 characters.',
  })
  cancellationReason: string;

  @ApiPropertyOptional({
    description:
      'The reason as a fixed code, so both apps can offer a picker and the platform can report on causes.',
    enum: CancellationReasonCode,
    enumName: 'CancellationReasonCode',
    example: CancellationReasonCode.DRIVER_NO_SHOW,
  })
  @IsOptional()
  @IsEnum(CancellationReasonCode, {
    message: `The cancellation reason code must be one of: ${Object.values(CancellationReasonCode).join(', ')}.`,
  })
  cancellationReasonCode?: CancellationReasonCode;
}
