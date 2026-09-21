import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Input for the retailer completing a handover by scanning the recipient's QR. */
export class ConfirmDonationDto {
  @ApiProperty({
    description:
      'Pickup token the recipient presented. Must be unconsumed, unexpired, and issued for this donation.',
    example: 'PT-7F3A9C2E4B',
    maxLength: 60,
  })
  @IsNotEmpty({ message: 'The pickup token code cannot be empty.' })
  @IsString({ message: 'The pickup token code must be a string.' })
  @MaxLength(60, {
    message: 'The pickup token code cannot be longer than 60 characters.',
  })
  pickupTokenCode: string;
}
