import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * The account fields both registration flows share.
 *
 * `fullName` is required rather than optional on purpose: it creates the contact
 * linked to this login, which is what a donation certificate prints as the
 * authorising signatory. Without it every certificate this account releases would
 * fall back to a branch contact or the placeholder.
 */
export abstract class RegisterBaseDto {
  @ApiProperty({
    description: 'Sign-in address. Must not already be registered.',
    example: 'ops@mercadona.es',
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: 'The email cannot be empty.' })
  @IsEmail({}, { message: 'The email must be a valid address.' })
  @MaxLength(255, {
    message: 'The email cannot be longer than 255 characters.',
  })
  email: string;

  @ApiProperty({
    description: 'Plain-text password. Hashed before storage, never returned.',
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
      'Name of the person registering. Becomes the primary contact for the organization and the signatory on its certificates.',
    example: 'Marta Ruiz',
    minLength: 2,
    maxLength: 150,
  })
  @IsNotEmpty({ message: 'The full name cannot be empty.' })
  @IsString({ message: 'The full name must be a string.' })
  @MinLength(2, {
    message: 'The full name must be at least 2 characters long.',
  })
  @MaxLength(150, {
    message: 'The full name cannot be longer than 150 characters.',
  })
  fullName: string;

  @ApiPropertyOptional({
    description: 'Contact phone in E.164 format.',
    example: '+34931234567',
    maxLength: 30,
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message:
      'The phone number must be in E.164 format, for example +34931234567.',
  })
  phone?: string;
}
