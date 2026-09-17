import { ApiProperty } from '@nestjs/swagger';

import type { User } from '../../users/entities/user.entity.js';
import { UserResponseDto } from '../../users/dto/index.js';

/** A signed access token plus the account it belongs to. */
export class LoginResponseDto {
  @ApiProperty({
    description:
      'Signed access token. Send it as `Authorization: Bearer <token>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Scheme to use in the Authorization header.',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'When the access token expires (ISO 8601).',
    type: String,
    format: 'date-time',
    example: '2026-09-17T12:32:05.000Z',
  })
  expiresAt: string;

  @ApiProperty({ description: 'The signed-in account.', type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Signed in successfully.',
  })
  message: string;

  /**
   * Builds the login payload from the authenticated user and the issued token.
   * @param data The User entity that just signed in.
   * @param accessToken The signed access token.
   * @param expiresAt When that token expires.
   * @param message Message for the caller.
   */
  constructor(
    data: User,
    accessToken: string,
    expiresAt: Date,
    message: string,
  ) {
    this.accessToken = accessToken;
    this.tokenType = 'Bearer';
    this.expiresAt = expiresAt.toISOString();
    this.user = new UserResponseDto(data);
    this.message = message;
  }
}
