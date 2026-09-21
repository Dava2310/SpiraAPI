import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Input for issuing a certificate.
 *
 * Deliberately small: every party name and total is snapshotted from the
 * donation by the service, so a caller cannot state a weight or a donor that
 * the donation does not support. This is invoked when a handover is confirmed,
 * not as a client-facing create.
 */
export class CreateDonationReceiptDto {
  @ApiProperty({
    description:
      'Donation to certify. Must be `DELIVERED` and not yet certified.',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'The donation ID cannot be empty.' })
  @IsUUID('4', { message: 'The donation ID must be a valid UUID.' })
  donationId: string;

  @ApiPropertyOptional({
    description:
      'Statute the certificate is issued under. Depends on jurisdiction, so it is supplied rather than hard-coded.',
    example: 'Food Recovery & Good Samaritan Acts',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'The legal reference must be a string.' })
  @MaxLength(200, {
    message: 'The legal reference cannot be longer than 200 characters.',
  })
  legalReference?: string;

  @ApiPropertyOptional({
    description:
      'Conversion factors to price the impact figures with. Defaults to the set effective on the issue date.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The impact factor ID must be a valid UUID.' })
  impactFactorId?: string;
}
