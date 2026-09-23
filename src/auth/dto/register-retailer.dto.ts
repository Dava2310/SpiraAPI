import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { BusinessType } from '../../retailers/enums/business-type.enum.js';
import { RegisterBaseDto } from './register-base.dto.js';

/** Input for a retailer registering itself and its first login. */
export class RegisterRetailerDto extends RegisterBaseDto {
  @ApiProperty({
    description: 'Registered company name.',
    example: 'Mercadona S.A.',
    minLength: 2,
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'The legal name cannot be empty.' })
  @IsString({ message: 'The legal name must be a string.' })
  @MinLength(2, {
    message: 'The legal name must be at least 2 characters long.',
  })
  @MaxLength(200, {
    message: 'The legal name cannot be longer than 200 characters.',
  })
  legalName: string;

  @ApiPropertyOptional({
    description: 'Public brand, when it differs from the legal name.',
    example: 'Mercadona',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'The trade name must be a string.' })
  @MaxLength(200, {
    message: 'The trade name cannot be longer than 200 characters.',
  })
  tradeName?: string;

  @ApiProperty({
    description:
      'Government tax identifier (NIF/CIF/VAT). Must not already be registered.',
    example: 'A46103834',
    maxLength: 40,
  })
  @IsNotEmpty({ message: 'The tax ID cannot be empty.' })
  @IsString({ message: 'The tax ID must be a string.' })
  @MaxLength(40, { message: 'The tax ID cannot be longer than 40 characters.' })
  taxId: string;

  @ApiProperty({
    description:
      'Kind of business, which shapes expected volume and logistics.',
    enum: BusinessType,
    enumName: 'BusinessType',
    example: BusinessType.SUPERMARKET,
  })
  @IsNotEmpty({ message: 'The business type cannot be empty.' })
  @IsEnum(BusinessType, {
    message: `The business type must be one of: ${Object.values(BusinessType).join(', ')}.`,
  })
  businessType: BusinessType;
}
