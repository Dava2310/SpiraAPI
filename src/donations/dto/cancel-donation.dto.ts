import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

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
}
