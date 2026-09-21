import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** Input for sending a draft donation to the recipient. */
export class OfferDonationDto {
  @ApiPropertyOptional({
    description:
      'Proposed collection time. Overrides whatever the draft carried.',
    format: 'date-time',
    example: '2026-09-18T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The scheduled pickup time must be a valid ISO 8601 date.' },
  )
  scheduledPickupAt?: string;
}
