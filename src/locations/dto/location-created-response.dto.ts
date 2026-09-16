import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Location } from '../entities/location.entity.js';
import { LocationResponseDto } from './location-response.dto.js';

/** A location together with a success message, returned by create and update. */
export class LocationCreatedResponseDto extends LocationResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Location created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: Location, message: string) {
    super(data);
    this.message = message;
  }
}
