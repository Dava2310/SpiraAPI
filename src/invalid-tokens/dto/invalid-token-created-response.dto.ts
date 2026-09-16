import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { InvalidToken } from '../entities/invalid-token.entity.js';
import { InvalidTokenResponseDto } from './invalid-token-response.dto.js';

/** A denylist entry together with a success message, returned by create and update. */
export class InvalidTokenCreatedResponseDto extends InvalidTokenResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Token revoked successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: InvalidToken, message: string) {
    super(data);
    this.message = message;
  }
}
