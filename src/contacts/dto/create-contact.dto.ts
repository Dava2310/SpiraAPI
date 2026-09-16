import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { ContactType } from '../enums/contact-type.enum.js';

/** Input for creating a contact. Exactly one owner must be given. */
export class CreateContactDto {
  @ApiPropertyOptional({
    description:
      'Owning retailer. Provide exactly one of `retailerId` / `recipientId`.',
    format: 'uuid',
    example: '3f2c1b8e-9a4d-4c7f-8b1e-2d6a5c9f0e11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The retailer ID must be a valid UUID.' })
  retailerId?: string;

  @ApiPropertyOptional({
    description:
      'Owning recipient. Provide exactly one of `retailerId` / `recipientId`.',
    format: 'uuid',
    example: '7a1e4c9d-2b8f-4e6a-9c30-5d7b1f2a8c44',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The recipient ID must be a valid UUID.' })
  recipientId?: string;

  @ApiProperty({
    description: 'Full name of the person.',
    example: 'María González',
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
    description: 'Email address. Stored case-insensitively.',
    example: 'maria.gonzalez@real.com.py',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'You must provide a valid email address.' })
  @MaxLength(255, {
    message: 'The email cannot be longer than 255 characters.',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format.',
    example: '+595981123456',
    maxLength: 30,
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message:
      'The phone number must be in E.164 format, for example +595981123456.',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Alternate phone number in E.164 format.',
    example: '+595981654321',
    maxLength: 30,
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message:
      'The secondary phone number must be in E.164 format, for example +595981654321.',
  })
  secondaryPhone?: string;

  @ApiPropertyOptional({
    description: 'Role inside the organization.',
    example: 'Head of Operations',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'The job title must be a string.' })
  @MaxLength(100, {
    message: 'The job title cannot be longer than 100 characters.',
  })
  jobTitle?: string;

  @ApiProperty({
    description: 'Which function this contact covers.',
    enum: ContactType,
    enumName: 'ContactType',
    example: ContactType.OPERATIONS,
  })
  @IsNotEmpty({ message: 'The contact type cannot be empty.' })
  @IsEnum(ContactType, {
    message: `The contact type must be one of: ${Object.values(ContactType).join(', ')}.`,
  })
  type: ContactType;

  @ApiPropertyOptional({
    description: 'Marks the main contact for the owner. At most one per owner.',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The primary flag must be a boolean.' })
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Internal notes about reaching this person.',
    example: 'Prefers WhatsApp. Unavailable Mondays.',
  })
  @IsOptional()
  @IsString({ message: 'The notes must be a string.' })
  notes?: string;
}
