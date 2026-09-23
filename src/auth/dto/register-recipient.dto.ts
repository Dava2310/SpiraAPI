import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  MaxLength,
  MinLength,
} from 'class-validator';

import { RecipientType } from '../../recipients/enums/recipient-type.enum.js';
import { RegisterBaseDto } from './register-base.dto.js';

/** Input for an NGO or foodbank registering itself and its first login. */
export class RegisterRecipientDto extends RegisterBaseDto {
  @ApiProperty({
    description: "The organization's public name.",
    example: 'Banc dels Aliments',
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

  @ApiProperty({
    description: 'What kind of receiver this is.',
    enum: RecipientType,
    enumName: 'RecipientType',
    example: RecipientType.FOOD_BANK,
  })
  @IsNotEmpty({ message: 'The recipient type cannot be empty.' })
  @IsEnum(RecipientType, {
    message: `The recipient type must be one of: ${Object.values(RecipientType).join(', ')}.`,
  })
  type: RecipientType;

  @ApiPropertyOptional({
    description: 'Registered organization name, when it differs.',
    example: 'Fundació Banc dels Aliments',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'The legal name must be a string.' })
  @MaxLength(200, {
    message: 'The legal name cannot be longer than 200 characters.',
  })
  legalName?: string;

  @ApiPropertyOptional({
    description:
      'Government tax identifier. Must not already be registered when given.',
    example: 'G12345678',
    maxLength: 40,
  })
  @IsOptional()
  @IsString({ message: 'The tax ID must be a string.' })
  @MaxLength(40, { message: 'The tax ID cannot be longer than 40 characters.' })
  taxId?: string;

  @ApiPropertyOptional({
    description:
      'Charity or non-profit registration number. Must not already be registered when given.',
    example: 'G-12345678',
    maxLength: 40,
  })
  @IsOptional()
  @IsString({ message: 'The registration code must be a string.' })
  @MaxLength(40, {
    message: 'The registration code cannot be longer than 40 characters.',
  })
  registrationCode?: string;

  @ApiPropertyOptional({
    description: 'Where they operate, as they describe it.',
    example: 'Metropolitan Barcelona',
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'The service area must be a string.' })
  @MaxLength(120, {
    message: 'The service area cannot be longer than 120 characters.',
  })
  serviceArea?: string;

  @ApiPropertyOptional({
    description:
      'IANA timezone. Pickup windows and the today/upcoming split are resolved in it.',
    default: 'Europe/Madrid',
    example: 'Europe/Madrid',
    maxLength: 50,
  })
  @IsOptional()
  @IsTimeZone({
    message:
      'The timezone must be a valid IANA name, for example Europe/Madrid.',
  })
  @MaxLength(50, {
    message: 'The timezone cannot be longer than 50 characters.',
  })
  timezone?: string;
}
