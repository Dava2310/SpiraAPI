import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Recipient } from '../entities/recipient.entity.js';
import { RecipientResponseDto } from './recipient-response.dto.js';

/** A recipient together with a success message, returned by create and update. */
export class RecipientCreatedResponseDto extends RecipientResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Recipient created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: Recipient, message: string) {
    super(data);
    this.message = message;
  }
}
