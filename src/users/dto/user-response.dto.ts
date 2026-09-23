import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

import type { User } from '../entities/user.entity.js';
import { UserRole } from '../enums/user-role.enum.js';

/** API representation of a user. Never carries the password hash. */
export class UserResponseDto {
  @ApiProperty({
    type: String,
    description: 'Unique user ID.',
    format: 'uuid',
    example: '3f2c1b8e-9a4d-4c7f-8b1e-2d6a5c9f0e11',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Login email.',
    example: 'maria.gonzalez@real.com.py',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Authorization role.',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.RETAILER,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    type: String,
    description: 'Linked retailer, when `role` is `RETAILER`.',
    format: 'uuid',
    nullable: true,
    example: null,
  })
  retailerId: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Linked recipient, when `role` is `RECIPIENT`.',
    format: 'uuid',
    nullable: true,
    example: null,
  })
  recipientId: string | null;

  @ApiProperty({
    description: 'Whether the account may log in.',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the email has been confirmed.',
    example: false,
  })
  @IsBoolean()
  isEmailVerified: boolean;

  @ApiPropertyOptional({
    description: 'When the email was confirmed (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  emailVerifiedAt: string | null;

  @ApiPropertyOptional({
    description: 'Last successful login (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  lastLoginAt: string | null;

  @ApiProperty({
    description: 'When the account was created (ISO 8601).',
    type: String,
    format: 'date-time',
    example: '2026-09-16T14:32:05.123Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the account was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
    example: '2026-09-16T14:32:05.123Z',
  })
  updatedAt: string;

  /**
   * Maps a User entity onto its API representation.
   * @param data The User entity loaded from the database.
   */
  constructor(data: User) {
    this.id = data.id;
    this.email = data.email;
    this.role = data.role;
    this.retailerId = data.retailerId;
    this.recipientId = data.recipientId;
    this.isActive = data.isActive;
    this.isEmailVerified = data.emailVerifiedAt != null;
    this.emailVerifiedAt = data.emailVerifiedAt
      ? data.emailVerifiedAt.toISOString()
      : null;
    this.lastLoginAt = data.lastLoginAt ? data.lastLoginAt.toISOString() : null;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
