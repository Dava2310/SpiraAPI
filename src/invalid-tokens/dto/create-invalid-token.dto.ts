import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

import { InvalidTokenReason } from '../enums/invalid-token-reason.enum.js';

/** Input for adding a token to the denylist. */
export class CreateInvalidTokenDto {
  @ApiProperty({
    description: "The revoked token's `jti` claim. Must be unique.",
    format: 'uuid',
    example: '9b1d4f2a-6c3e-4a8b-9f10-7e5c2d4a8b16',
  })
  @IsNotEmpty({ message: 'The jti cannot be empty.' })
  @IsUUID('4', { message: 'The jti must be a valid UUID.' })
  jti: string;

  @ApiProperty({
    description: 'Owner of the revoked token.',
    format: 'uuid',
    example: '3f2c1b8e-9a4d-4c7f-8b1e-2d6a5c9f0e11',
  })
  @IsNotEmpty({ message: 'The user ID cannot be empty.' })
  @IsUUID('4', { message: 'The user ID must be a valid UUID.' })
  userId: string;

  @ApiProperty({
    description: 'When the token naturally expires (the JWT `exp`).',
    format: 'date-time',
    example: '2026-09-16T15:32:05.000Z',
  })
  @IsNotEmpty({ message: 'The expiry date cannot be empty.' })
  @IsDateString(
    {},
    { message: 'The expiry date must be a valid ISO 8601 date.' },
  )
  expiresAt: string;

  @ApiProperty({
    description: 'Why the token was revoked.',
    enum: InvalidTokenReason,
    enumName: 'InvalidTokenReason',
    example: InvalidTokenReason.LOGOUT,
  })
  @IsNotEmpty({ message: 'The reason cannot be empty.' })
  @IsEnum(InvalidTokenReason, {
    message: `The reason must be one of: ${Object.values(InvalidTokenReason).join(', ')}.`,
  })
  reason: InvalidTokenReason;
}
