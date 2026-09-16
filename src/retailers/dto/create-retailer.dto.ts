import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { FoodCategory } from '../../common/enums/food-category.enum.js';
import { BusinessType } from '../enums/business-type.enum.js';
import { DonationFrequency } from '../enums/donation-frequency.enum.js';

/** Input for creating a retailer. */
export class CreateRetailerDto {
  @ApiProperty({
    description: 'Registered company name.',
    example: 'Supermercados Real S.A.',
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
    example: 'Real',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'The trade name must be a string.' })
  @MaxLength(200, {
    message: 'The trade name cannot be longer than 200 characters.',
  })
  tradeName?: string;

  @ApiProperty({
    description: 'URL-friendly identifier. Must be unique.',
    example: 'supermercados-real',
    maxLength: 120,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: 'The slug cannot be empty.' })
  @MaxLength(120, { message: 'The slug cannot be longer than 120 characters.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'The slug may only contain lowercase letters, digits and single hyphens between them.',
  })
  slug: string;

  @ApiProperty({
    description: 'Government tax identifier (RUC/NIT/CIF/EIN). Must be unique.',
    example: '80012345-6',
    maxLength: 40,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'The tax ID cannot be empty.' })
  @IsString({ message: 'The tax ID must be a string.' })
  @MaxLength(40, { message: 'The tax ID cannot be longer than 40 characters.' })
  taxId: string;

  @ApiProperty({
    description: 'Kind of business the retailer runs.',
    enum: BusinessType,
    enumName: 'BusinessType',
    example: BusinessType.SUPERMARKET,
  })
  @IsNotEmpty({ message: 'The business type cannot be empty.' })
  @IsEnum(BusinessType, {
    message: `The business type must be one of: ${Object.values(BusinessType).join(', ')}.`,
  })
  businessType: BusinessType;

  @ApiPropertyOptional({
    description: 'Free-text presentation of the company.',
  })
  @IsOptional()
  @IsString({ message: 'The description must be a string.' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Public website.',
    example: 'https://real.com.py',
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: 'The website must be a valid URL.' })
  @MaxLength(255, {
    message: 'The website cannot be longer than 255 characters.',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Absolute URL of the logo.',
    example: 'https://cdn.spira.app/logos/supermercados-real.png',
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: 'The logo URL must be a valid URL.' })
  @MaxLength(255, {
    message: 'The logo URL cannot be longer than 255 characters.',
  })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Food categories this retailer typically donates.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    example: [FoodCategory.PRODUCE, FoodCategory.BAKERY],
  })
  @IsOptional()
  @IsArray({ message: 'The food categories must be an array.' })
  @ArrayUnique({ message: 'The food categories cannot contain duplicates.' })
  @IsEnum(FoodCategory, {
    each: true,
    message: `Each food category must be one of: ${Object.values(FoodCategory).join(', ')}.`,
  })
  foodCategories?: FoodCategory[];

  @ApiPropertyOptional({
    description: 'How often surplus is expected.',
    enum: DonationFrequency,
    enumName: 'DonationFrequency',
    example: DonationFrequency.DAILY,
  })
  @IsOptional()
  @IsEnum(DonationFrequency, {
    message: `The donation frequency must be one of: ${Object.values(DonationFrequency).join(', ')}.`,
  })
  donationFrequency?: DonationFrequency;

  @ApiPropertyOptional({
    description: 'Whether the recipient must collect the donation itself.',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'The recipient transport flag must be a boolean.' })
  requiresRecipientTransport?: boolean;

  @ApiPropertyOptional({
    description: 'Lead time needed before a collection, in hours.',
    example: 4,
    minimum: 0,
    maximum: 720,
  })
  @IsOptional()
  @IsInt({ message: 'The minimum pickup notice must be an integer.' })
  @Min(0, { message: 'The minimum pickup notice cannot be negative.' })
  @Max(720, { message: 'The minimum pickup notice cannot exceed 720 hours.' })
  minPickupNoticeHours?: number;

  @ApiPropertyOptional({
    description: 'Practical notes for whoever collects the donation.',
    example:
      'Enter through the loading dock on Calle Palma and ask for the shift manager.',
  })
  @IsOptional()
  @IsString({ message: 'The handling instructions must be a string.' })
  handlingInstructions?: string;

  @ApiPropertyOptional({
    description: 'Food-safety licence number.',
    maxLength: 80,
  })
  @IsOptional()
  @IsString({ message: 'The licence number must be a string.' })
  @MaxLength(80, {
    message: 'The licence number cannot be longer than 80 characters.',
  })
  foodSafetyLicenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Licence expiry date (calendar date, no time).',
    format: 'date',
    example: '2027-03-31',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'The licence expiry date must use the format YYYY-MM-DD.',
  })
  foodSafetyLicenseExpiresAt?: string;

  @ApiPropertyOptional({
    description: 'When the retailer accepted the platform terms.',
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
