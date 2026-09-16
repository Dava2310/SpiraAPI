import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Retailer } from '../entities/retailer.entity.js';
import { RetailerResponseDto } from './retailer-response.dto.js';

/** A retailer together with a success message, returned by create and update. */
export class RetailerCreatedResponseDto extends RetailerResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Retailer created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: Retailer, message: string) {
    super(data);
    this.message = message;
  }
}
