import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Input for the retailer's scanner resolving a presented credential. */
export class VerifyPickupTokenDto {
  @ApiProperty({
    description:
      'The scanned QR payload, or the PIN keyed in by hand. Both resolve to the same token.',
    example: '482913',
    maxLength: 60,
  })
  @IsNotEmpty({ message: 'The code cannot be empty.' })
  @IsString({ message: 'The code must be a string.' })
  @MaxLength(60, { message: 'The code cannot be longer than 60 characters.' })
  code: string;
}
