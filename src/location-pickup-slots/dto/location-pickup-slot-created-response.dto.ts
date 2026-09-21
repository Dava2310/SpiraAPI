import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { LocationPickupSlot } from '../entities/location-pickup-slot.entity.js';
import { LocationPickupSlotResponseDto } from './location-pickup-slot-response.dto.js';

/** A slot together with a success message, returned by create and update. */
export class LocationPickupSlotCreatedResponseDto extends LocationPickupSlotResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Pickup slot created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: LocationPickupSlot, message: string) {
    super(data);
    this.message = message;
  }
}
