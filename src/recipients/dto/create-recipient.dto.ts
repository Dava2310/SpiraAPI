import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { RecipientType } from '../enums/recipient-type.enum.js';

/** Input for creating a recipient. */
export class CreateRecipientDto {
  @ApiProperty({
    description: 'What kind of receiver this is.',
    enum: RecipientType,
    enumName: 'RecipientType',
    example: RecipientType.FOOD_BANK,
  })
  @IsNotEmpty({ message: 'The type cannot be empty.' })
  @IsEnum(RecipientType, {
    message: `The type must be one of: ${Object.values(RecipientType).join(', ')}.`,
  })
  type: RecipientType;

  @ApiPropertyOptional({
    description:
      'Registered organization name. Leave unset for a certified individual.',
    example: 'Fundación Banco de Alimentos Paraguay',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'The legal name must be a string.' })
  @MaxLength(200, {
    message: 'The legal name cannot be longer than 200 characters.',
  })
  legalName?: string;

  @ApiProperty({
    description: "Public name of the organization, or the person's name.",
    example: 'Banco de Alimentos Paraguay',
    minLength: 2,
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'The display name cannot be empty.' })
  @IsString({ message: 'The display name must be a string.' })
  @MinLength(2, {
    message: 'The display name must be at least 2 characters long.',
  })
  @MaxLength(200, {
    message: 'The display name cannot be longer than 200 characters.',
  })
  displayName: string;

  @ApiPropertyOptional({
    description: 'Abbreviated name, used wherever the UI is short of space.',
    example: 'Banco de Alimentos',
    maxLength: 80,
  })
  @IsOptional()
  @IsString({ message: 'The short name must be a string.' })
  @MaxLength(80, {
    message: 'The short name cannot be longer than 80 characters.',
  })
  shortName?: string;

  @ApiPropertyOptional({
    description: 'Government tax identifier. Organizations only, and unique.',
    example: '80098765-4',
    maxLength: 40,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'The tax ID must be a string.' })
  @MaxLength(40, { message: 'The tax ID cannot be longer than 40 characters.' })
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Free-text description of who they serve and how.',
  })
  @IsOptional()
  @IsString({ message: 'The mission must be a string.' })
  mission?: string;

  @ApiPropertyOptional({ description: 'Public website.', maxLength: 255 })
  @IsOptional()
  @IsUrl({}, { message: 'The website must be a valid URL.' })
  @MaxLength(255, {
    message: 'The website cannot be longer than 255 characters.',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Absolute URL of the logo.',
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: 'The logo URL must be a valid URL.' })
  @MaxLength(255, {
    message: 'The logo URL cannot be longer than 255 characters.',
  })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Food-handling certification number.',
    maxLength: 80,
  })
  @IsOptional()
  @IsString({ message: 'The certification number must be a string.' })
  @MaxLength(80, {
    message: 'The certification number cannot be longer than 80 characters.',
  })
  foodHandlingCertificationNumber?: string;

  @ApiPropertyOptional({
    description: 'Certification expiry date (calendar date, no time).',
    format: 'date',
    example: '2027-06-30',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'The certification expiry date must use the format YYYY-MM-DD.',
  })
  certificationExpiresAt?: string;

  @ApiPropertyOptional({
    description: 'When the recipient accepted the platform terms.',
    format: 'date-time',
    example: '2026-09-16T14:32:05.123Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The terms acceptance date must be a valid ISO 8601 date.' },
  )
  termsAcceptedAt?: string;

  @ApiPropertyOptional({
    description: 'Version of the terms that was accepted.',
    example: '2026-01',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'The terms version must be a string.' })
  @MaxLength(20, {
    message: 'The terms version cannot be longer than 20 characters.',
  })
  termsVersion?: string;
}
