import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO31661Alpha2,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { LocationType } from '../enums/location-type.enum.js';
import { OpeningHoursDto } from './opening-hours.dto.js';
import { PickupWindowDto } from './pickup-window.dto.js';

/** Input for creating a location. Exactly one owner must be given. */
export class CreateLocationDto {
  @ApiPropertyOptional({
    description:
      'Owning retailer. Provide exactly one of `retailerId` / `recipientId`.',
    format: 'uuid',
  })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'The retailer ID must be a valid UUID.',
  })
  retailerId?: string;

  @ApiPropertyOptional({
    description:
      'Owning recipient. Provide exactly one of `retailerId` / `recipientId`.',
    format: 'uuid',
  })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'The recipient ID must be a valid UUID.',
  })
  recipientId?: string;

  @ApiProperty({
    description: 'Human-readable name for the site.',
    example: 'Sucursal Centro',
    minLength: 2,
    maxLength: 150,
  })
  @IsNotEmpty({ message: 'The label cannot be empty.' })
  @IsString({ message: 'The label must be a string.' })
  @MinLength(2, { message: 'The label must be at least 2 characters long.' })
  @MaxLength(150, {
    message: 'The label cannot be longer than 150 characters.',
  })
  label: string;

  @ApiPropertyOptional({
    description: 'Human-readable branch code, unique per owner.',
    example: 'WF-NYC-402',
    maxLength: 40,
  })
  @IsOptional()
  @IsString({ message: 'The code must be a string.' })
  @MaxLength(40, { message: 'The code cannot be longer than 40 characters.' })
  code?: string;

  @ApiProperty({
    description: 'What kind of site this is.',
    enum: LocationType,
    enumName: 'LocationType',
    example: LocationType.STORE,
  })
  @IsNotEmpty({ message: 'The location type cannot be empty.' })
  @IsEnum(LocationType, {
    message: `The location type must be one of: ${Object.values(LocationType).join(', ')}.`,
  })
  type: LocationType;

  @ApiProperty({
    description: 'Street address, first line.',
    example: 'Palma 456',
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'The address line 1 cannot be empty.' })
  @IsString({ message: 'The address line 1 must be a string.' })
  @MaxLength(200, {
    message: 'The address line 1 cannot be longer than 200 characters.',
  })
  addressLine1: string;

  @ApiPropertyOptional({
    description: 'Street address, second line.',
    example: 'esq. Alberdi',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'The address line 2 must be a string.' })
  @MaxLength(200, {
    message: 'The address line 2 cannot be longer than 200 characters.',
  })
  addressLine2?: string;

  @ApiProperty({ description: 'City.', example: 'Asunción', maxLength: 100 })
  @IsNotEmpty({ message: 'The city cannot be empty.' })
  @IsString({ message: 'The city must be a string.' })
  @MaxLength(100, { message: 'The city cannot be longer than 100 characters.' })
  city: string;

  @ApiPropertyOptional({
    description: 'State, region or department.',
    example: 'Central',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'The state must be a string.' })
  @MaxLength(100, {
    message: 'The state cannot be longer than 100 characters.',
  })
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal code.',
    example: '1209',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'The postal code must be a string.' })
  @MaxLength(20, {
    message: 'The postal code cannot be longer than 20 characters.',
  })
  postalCode?: string;

  @ApiProperty({
    description: 'Country as an ISO 3166-1 alpha-2 code.',
    example: 'PY',
    minLength: 2,
    maxLength: 2,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'The country code cannot be empty.' })
  @IsISO31661Alpha2({
    message:
      'The country code must be a valid ISO 3166-1 alpha-2 code, for example PY.',
  })
  countryCode: string;

  @ApiPropertyOptional({
    description: 'Latitude in decimal degrees.',
    example: -25.281,
  })
  @IsOptional()
  @IsLatitude({ message: 'The latitude must be between -90 and 90.' })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude in decimal degrees.',
    example: -57.635,
  })
  @IsOptional()
  @IsLongitude({ message: 'The longitude must be between -180 and 180.' })
  longitude?: number;

  @ApiProperty({
    description: 'IANA timezone of the site. `pickupWindows` are local to it.',
    example: 'America/Asuncion',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'The timezone cannot be empty.' })
  @IsTimeZone({
    message:
      'The timezone must be a valid IANA name, for example America/Asuncion.',
  })
  @MaxLength(50, {
    message: 'The timezone cannot be longer than 50 characters.',
  })
  timezone: string;

  @ApiPropertyOptional({
    description:
      'Public opening hours, by weekday. Distinct from `pickupWindows`, which is when collections may happen.',
    type: [OpeningHoursDto],
  })
  @IsOptional()
  @IsArray({ message: 'The opening hours must be an array.' })
  @ArrayMaxSize(14, { message: 'At most 14 opening-hour entries are allowed.' })
  @ValidateNested({ each: true })
  @Type(() => OpeningHoursDto)
  openingHours?: OpeningHoursDto[];

  @ApiPropertyOptional({
    description: 'Recurring collection availability, by weekday.',
    type: [PickupWindowDto],
  })
  @IsOptional()
  @IsArray({ message: 'The pickup windows must be an array.' })
  @ArrayMaxSize(50, { message: 'At most 50 pickup windows are allowed.' })
  @ValidateNested({ each: true })
  @Type(() => PickupWindowDto)
  pickupWindows?: PickupWindowDto[];

  @ApiPropertyOptional({
    description: 'Whether the site has refrigerated storage.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The cold storage flag must be a boolean.' })
  hasColdStorage?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the site has a freezer.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The freezer flag must be a boolean.' })
  hasFreezer?: boolean;

  @ApiPropertyOptional({
    description: 'Direct line for the site, in E.164 format.',
    example: '+595214451234',
    maxLength: 30,
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message:
      'The phone number must be in E.164 format, for example +595214451234.',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Marks the headquarters / main site. At most one per owner.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The primary flag must be a boolean.' })
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Set to `false` to take the site out of matching temporarily.',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'The active flag must be a boolean.' })
  isActive?: boolean;
}
