import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Donation } from '../entities/donation.entity.js';
import { DonationResponseDto } from './donation-response.dto.js';

/**
 * A donation together with a success message, returned by create, update and
 * every lifecycle transition.
 */
export class DonationCreatedResponseDto extends DonationResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Donation created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: Donation, message: string) {
    super(data);
    this.message = message;
  }
}
