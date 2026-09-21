import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/index.js';
import { ProductCategory } from '../../common/enums/product-category.enum.js';
import { SurplusUrgency } from '../../common/enums/surplus-urgency.enum.js';

/** How the surplus shelf may be ordered. */
export enum SurplusPackageSort {
  DISTANCE = 'distance',
  URGENCY = 'urgency',
  WEIGHT = 'weight',
  VALUE = 'value',
}

/** Filters for the open surplus shelf the recipient app browses. */
export class QuerySurplusPackagesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Latitude to measure distance from. Defaults to the recipient’s primary location.',
    example: 41.3874,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'The latitude must be between -90 and 90.' })
  lat?: number;

  @ApiPropertyOptional({
    description:
      'Longitude to measure distance from. Defaults to the recipient’s primary location.',
    example: 2.1686,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'The longitude must be between -180 and 180.' })
  lng?: number;

  @ApiPropertyOptional({
    description:
      'How far to search, in kilometres. Defaults to the recipient’s saved alert radius.',
    type: Number,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'The radius must be a number.' })
  @Min(1, { message: 'The radius must be at least 1 km.' })
  @Max(500, { message: 'The radius cannot exceed 500 km.' })
  radiusKm?: number;

  @ApiPropertyOptional({
    description: 'Free-text search across store name, product name and brand.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'The search term must be a string.' })
  @MaxLength(120, {
    message: 'The search term cannot be longer than 120 characters.',
  })
  q?: string;

  @ApiPropertyOptional({
    description: 'Only stores holding this category.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
  })
  @IsOptional()
  @IsEnum(ProductCategory, {
    message: `The category must be one of: ${Object.values(ProductCategory).join(', ')}.`,
  })
  category?: ProductCategory;

  @ApiPropertyOptional({
    description:
      'Only stores whose most pressing stock is at least this urgent.',
    enum: SurplusUrgency,
    enumName: 'SurplusUrgency',
  })
  @IsOptional()
  @IsEnum(SurplusUrgency, {
    message: `The urgency must be one of: ${Object.values(SurplusUrgency).join(', ')}.`,
  })
  urgency?: SurplusUrgency;

  @ApiPropertyOptional({ description: 'Narrow to one store.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'The location ID must be a valid UUID.' })
  locationId?: string;

  @ApiPropertyOptional({
    description: 'How to order the shelf.',
    enum: SurplusPackageSort,
    enumName: 'SurplusPackageSort',
    default: SurplusPackageSort.DISTANCE,
  })
  @IsOptional()
  @IsEnum(SurplusPackageSort, {
    message: `The sort must be one of: ${Object.values(SurplusPackageSort).join(', ')}.`,
  })
  sort?: SurplusPackageSort;
}
