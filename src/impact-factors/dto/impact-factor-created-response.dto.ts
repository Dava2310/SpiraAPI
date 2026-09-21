import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { ImpactFactor } from '../entities/impact-factor.entity.js';
import { ImpactFactorResponseDto } from './impact-factor-response.dto.js';

/** A factor set together with a success message, returned by create and update. */
export class ImpactFactorCreatedResponseDto extends ImpactFactorResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Impact factors created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: ImpactFactor, message: string) {
    super(data);
    this.message = message;
  }
}
