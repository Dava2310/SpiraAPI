import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Input for the retailer completing a handover.
 *
 * The code is the scanned QR payload; the PIN is the same credential keyed in
 * by hand, which the retailer's scanner offers when a camera will not focus.
 */
export class ConfirmDonationDto {
  @ApiProperty({
    description:
      'Pickup token the recipient presented, as the scanned code or its PIN. Must be unconsumed, unexpired, and issued for this donation.',
    example: 'PT-7F3A9C2E4B',
    maxLength: 60,
  })
  @IsNotEmpty({ message: 'The pickup token code cannot be empty.' })
  @IsString({ message: 'The pickup token code must be a string.' })
  @MaxLength(60, {
    message: 'The pickup token code cannot be longer than 60 characters.',
  })
  pickupTokenCode: string;

  @ApiPropertyOptional({
    description:
      'Who signed for the goods on the receiving side. The driver need not be a platform user, so this is free text.',
    example: 'Marta Ruiz',
    maxLength: 150,
  })
  @IsOptional()
  @IsString({ message: 'The received-by label must be a string.' })
  @MaxLength(150, {
    message: 'The received-by label cannot be longer than 150 characters.',
  })
  receivedByLabel?: string;
}
