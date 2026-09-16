import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';

import { UserRole } from '../enums/user-role.enum.js';

/** Input for creating a user. */
export class CreateUserDto {
  @ApiProperty({
    description: 'Login email. Stored case-insensitively.',
    example: 'maria.gonzalez@real.com.py',
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: 'The email cannot be empty.' })
  @IsEmail({}, { message: 'You must provide a valid email address.' })
  @MaxLength(255, {
    message: 'The email cannot be longer than 255 characters.',
  })
  email: string;

  @ApiProperty({
    description:
      'Plain-text password. Hashed before storage and never returned by the API.',
    example: 'Str0ng-P4ssw0rd',
    minLength: 12,
    maxLength: 72,
  })
  @IsNotEmpty({ message: 'The password cannot be empty.' })
  @IsString({ message: 'The password must be a string.' })
  @MinLength(12, {
    message: 'The password must be at least 12 characters long.',
  })
  @MaxLength(72, {
    message: 'The password cannot be longer than 72 characters.',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'The password must contain at least one lowercase letter, one uppercase letter and one digit.',
  })
  password: string;

  @ApiProperty({
    description:
      'Authorization role. Determines which profile must be linked: `RETAILER` requires `retailerId`, `RECIPIENT` requires `recipientId`, `ADMIN` requires neither.',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.RETAILER,
  })
  @IsNotEmpty({ message: 'The role cannot be empty.' })
  @IsEnum(UserRole, {
    message: `The role must be one of: ${Object.values(UserRole).join(', ')}.`,
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Retailer to link. Required when `role` is `RETAILER`.',
    format: 'uuid',
    example: '3f2c1b8e-9a4d-4c7f-8b1e-2d6a5c9f0e11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The retailer ID must be a valid UUID.' })
  retailerId?: string;

  @ApiPropertyOptional({
    description: 'Recipient to link. Required when `role` is `RECIPIENT`.',
    format: 'uuid',
    example: '7a1e4c9d-2b8f-4e6a-9c30-5d7b1f2a8c44',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The recipient ID must be a valid UUID.' })
  recipientId?: string;
}
