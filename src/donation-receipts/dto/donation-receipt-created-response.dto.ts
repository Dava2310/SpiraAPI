import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { DonationReceipt } from '../entities/donation-receipt.entity.js';
import { DonationReceiptResponseDto } from './donation-receipt-response.dto.js';

/** A certificate together with a success message, returned when one is issued. */
export class DonationReceiptCreatedResponseDto extends DonationReceiptResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Certificate issued successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: DonationReceipt, message: string) {
    super(data);
    this.message = message;
  }
}
