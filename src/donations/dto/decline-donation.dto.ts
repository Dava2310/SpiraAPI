import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Input for a recipient turning down an offered donation. */
export class DeclineDonationDto {
  @ApiProperty({
    description:
      'Why the recipient cannot take it. Required, because the retailer needs it to re-offer elsewhere.',
    example: 'No cold storage available before Thursday.',
    minLength: 3,
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'The decline reason cannot be empty.' })
  @IsString({ message: 'The decline reason must be a string.' })
  @MinLength(3, {
    message: 'The decline reason must be at least 3 characters long.',
  })
  @MaxLength(500, {
    message: 'The decline reason cannot be longer than 500 characters.',
  })
  declineReason: string;
}
