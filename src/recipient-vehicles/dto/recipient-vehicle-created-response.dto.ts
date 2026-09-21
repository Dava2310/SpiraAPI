import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { RecipientVehicle } from '../entities/recipient-vehicle.entity.js';
import { RecipientVehicleResponseDto } from './recipient-vehicle-response.dto.js';

/** A vehicle together with a success message, returned by create and update. */
export class RecipientVehicleCreatedResponseDto extends RecipientVehicleResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Vehicle registered successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: RecipientVehicle, message: string) {
    super(data);
    this.message = message;
  }
}
