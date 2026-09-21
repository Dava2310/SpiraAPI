import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** Input for sending a draft donation to the recipient. */
export class OfferDonationDto {
  @ApiPropertyOptional({
    description:
      'Start of the proposed collection window. Overrides whatever the draft carried.',
    format: 'date-time',
    example: '2026-09-18T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The pickup window start must be a valid ISO 8601 date.' },
  )
  pickupWindowStart?: string;

  @ApiPropertyOptional({
    description: 'End of the proposed collection window.',
    format: 'date-time',
    example: '2026-09-18T20:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The pickup window end must be a valid ISO 8601 date.' },
  )
  pickupWindowEnd?: string;
}
