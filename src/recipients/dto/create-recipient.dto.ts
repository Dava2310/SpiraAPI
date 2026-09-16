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
  IsNumber,
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
import { DietaryRestriction } from '../enums/dietary-restriction.enum.js';
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

  @ApiProperty({
    description: 'URL-friendly identifier. Must be unique.',
    example: 'banco-de-alimentos-py',
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
    description: 'Registration number proving nonprofit status.',
    maxLength: 80,
  })
  @IsOptional()
  @IsString({ message: 'The nonprofit registration number must be a string.' })
  @MaxLength(80, {
    message:
      'The nonprofit registration number cannot be longer than 80 characters.',
  })
  nonprofitRegistrationNumber?: string;

  @ApiPropertyOptional({
    description: 'National ID document. Individuals only.',
    maxLength: 40,
  })
  @IsOptional()
  @IsString({ message: 'The national ID must be a string.' })
  @MaxLength(40, {
    message: 'The national ID cannot be longer than 40 characters.',
  })
  nationalId?: string;

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
    description: 'How far they are willing to travel, in kilometres.',
    example: 15,
    minimum: 0,
    maximum: 5000,
  })
  @IsOptional()
  @IsInt({ message: 'The service radius must be an integer.' })
  @Min(0, { message: 'The service radius cannot be negative.' })
  @Max(5000, { message: 'The service radius cannot exceed 5000 km.' })
  serviceRadiusKm?: number;

  @ApiPropertyOptional({
    description: 'Whether they have their own vehicle for collections.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The vehicle flag must be a boolean.' })
  hasVehicle?: boolean;

  @ApiPropertyOptional({
    description: 'How much they can carry in one trip, in kilograms.',
    example: 750.5,
    minimum: 0,
    maximum: 999999.99,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'The transport capacity must be a number with at most 2 decimal places.',
    },
  )
  @Min(0, { message: 'The transport capacity cannot be negative.' })
  @Max(999999.99, {
    message: 'The transport capacity cannot exceed 999999.99.',
  })
  transportCapacityKg?: number;

  @ApiPropertyOptional({
    description: 'Whether their transport is refrigerated.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The refrigerated transport flag must be a boolean.' })
  hasRefrigeratedTransport?: boolean;

  @ApiPropertyOptional({
    description: 'People fed per week.',
    example: 1200,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'The people served per week must be an integer.' })
  @Min(0, { message: 'The people served per week cannot be negative.' })
  peopleServedPerWeek?: number;

  @ApiPropertyOptional({
    description: 'Most they can take in a single day, in kilograms.',
    example: 2000,
    minimum: 0,
    maximum: 999999.99,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'The maximum daily intake must be a number with at most 2 decimal places.',
    },
  )
  @Min(0, { message: 'The maximum daily intake cannot be negative.' })
  @Max(999999.99, {
    message: 'The maximum daily intake cannot exceed 999999.99.',
  })
  maxDailyIntakeKg?: number;

  @ApiPropertyOptional({
    description: 'Categories they will take.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    example: [FoodCategory.PRODUCE, FoodCategory.DRY_GOODS],
  })
  @IsOptional()
  @IsArray({ message: 'The accepted food categories must be an array.' })
  @ArrayUnique({
    message: 'The accepted food categories cannot contain duplicates.',
  })
  @IsEnum(FoodCategory, {
    each: true,
    message: `Each accepted food category must be one of: ${Object.values(FoodCategory).join(', ')}.`,
  })
  acceptedFoodCategories?: FoodCategory[];

  @ApiPropertyOptional({
    description: 'Categories they explicitly refuse.',
    enum: FoodCategory,
    enumName: 'FoodCategory',
    isArray: true,
    example: [FoodCategory.MEAT],
  })
  @IsOptional()
  @IsArray({ message: 'The excluded food categories must be an array.' })
  @ArrayUnique({
    message: 'The excluded food categories cannot contain duplicates.',
  })
  @IsEnum(FoodCategory, {
    each: true,
    message: `Each excluded food category must be one of: ${Object.values(FoodCategory).join(', ')}.`,
  })
  excludedFoodCategories?: FoodCategory[];

  @ApiPropertyOptional({
    description: 'Dietary rules their beneficiaries follow.',
    enum: DietaryRestriction,
    enumName: 'DietaryRestriction',
    isArray: true,
    example: [DietaryRestriction.NO_PORK],
  })
  @IsOptional()
  @IsArray({ message: 'The dietary restrictions must be an array.' })
  @ArrayUnique({
    message: 'The dietary restrictions cannot contain duplicates.',
  })
  @IsEnum(DietaryRestriction, {
    each: true,
    message: `Each dietary restriction must be one of: ${Object.values(DietaryRestriction).join(', ')}.`,
  })
  dietaryRestrictions?: DietaryRestriction[];

  @ApiPropertyOptional({
    description: 'Whether they accept food close to its expiry date.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The near-expiry flag must be a boolean.' })
  acceptsNearExpiry?: boolean;

  @ApiPropertyOptional({
    description: 'Whether they accept already-prepared food.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The prepared-food flag must be a boolean.' })
  acceptsPreparedFood?: boolean;

  @ApiPropertyOptional({
    description: 'Whether they accept frozen goods.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The frozen flag must be a boolean.' })
  acceptsFrozen?: boolean;

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
    description: 'Liability insurance policy number.',
    maxLength: 80,
  })
  @IsOptional()
  @IsString({ message: 'The insurance policy number must be a string.' })
  @MaxLength(80, {
    message: 'The insurance policy number cannot be longer than 80 characters.',
  })
  insurancePolicyNumber?: string;

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
