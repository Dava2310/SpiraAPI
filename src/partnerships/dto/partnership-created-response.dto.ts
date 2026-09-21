import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Partnership } from '../entities/partnership.entity.js';
import { PartnershipResponseDto } from './partnership-response.dto.js';

/** A partnership together with a success message, returned by create and update. */
export class PartnershipCreatedResponseDto extends PartnershipResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Partnership created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: Partnership, message: string) {
    super(data);
    this.message = message;
  }
}
