import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/** Input for a recipient taking on an offered donation. */
export class AcceptDonationDto {
  @ApiPropertyOptional({
    description: 'Vehicle that will collect.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The vehicle ID must be a valid UUID.' })
  recipientVehicleId?: string;

  @ApiPropertyOptional({
    description:
      'Person who will collect. Supplies the driver name on the certificate.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The driver contact ID must be a valid UUID.' })
  driverContactId?: string;

  @ApiPropertyOptional({
    description:
      'Start of a collection window the recipient can actually make, if it differs from the one offered.',
    format: 'date-time',
    example: '2026-09-18T19:30:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The pickup window start must be a valid ISO 8601 date.' },
  )
  pickupWindowStart?: string;

  @ApiPropertyOptional({
    description: 'End of that window.',
    format: 'date-time',
    example: '2026-09-18T21:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The pickup window end must be a valid ISO 8601 date.' },
  )
  pickupWindowEnd?: string;
}
