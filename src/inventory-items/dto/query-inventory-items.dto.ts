import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/index.js';
import { DonationReason } from '../../common/enums/donation-reason.enum.js';
import { ProductCategory } from '../../common/enums/product-category.enum.js';
import { SurplusUrgency } from '../../common/enums/surplus-urgency.enum.js';
import { InventoryItemStatus } from '../enums/inventory-item-status.enum.js';

/** How a caller may narrow and order the inventory list. */
export enum InventoryItemSort {
  EXPIRES_AT_ASC = 'expiresAt:asc',
  EXPIRES_AT_DESC = 'expiresAt:desc',
  LISTED_AT_DESC = 'listedAt:desc',
  WEIGHT_DESC = 'weightKg:desc',
  VALUE_DESC = 'retailValue:desc',
}

/** Filters for the inventory list, shared by the retailer and NGO views. */
export class QueryInventoryItemsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Narrow to one branch.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The location ID must be a valid UUID.' })
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Narrow to one lifecycle state.',
    enum: InventoryItemStatus,
    enumName: 'InventoryItemStatus',
  })
  @IsOptional()
  @IsEnum(InventoryItemStatus, {
    message: `The status must be one of: ${Object.values(InventoryItemStatus).join(', ')}.`,
  })
  status?: InventoryItemStatus;

  @ApiPropertyOptional({
    description:
      'Free-text search across product name, brand and barcode. Matches anywhere in the value, not only the start.',
    example: 'sourdough',
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'The search term must be a string.' })
  @MaxLength(120, {
    message: 'The search term cannot be longer than 120 characters.',
  })
  q?: string;

  @ApiPropertyOptional({
    description: 'Narrow to one product category.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
  })
  @IsOptional()
  @IsEnum(ProductCategory, {
    message: `The category must be one of: ${Object.values(ProductCategory).join(', ')}.`,
  })
  category?: ProductCategory;

  @ApiPropertyOptional({
    description: 'Narrow to one donation reason.',
    enum: DonationReason,
    enumName: 'DonationReason',
  })
  @IsOptional()
  @IsEnum(DonationReason, {
    message: `The reason must be one of: ${Object.values(DonationReason).join(', ')}.`,
  })
  reason?: DonationReason;

  @ApiPropertyOptional({
    description: 'Narrow to one urgency band, computed from the expiry.',
    enum: SurplusUrgency,
    enumName: 'SurplusUrgency',
  })
  @IsOptional()
  @IsEnum(SurplusUrgency, {
    message: `The urgency must be one of: ${Object.values(SurplusUrgency).join(', ')}.`,
  })
  urgency?: SurplusUrgency;

  @ApiPropertyOptional({
    description: 'Narrow to lots published to the surplus shelf, or withheld.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'The listed flag must be true or false.' })
  isListed?: boolean;

  @ApiPropertyOptional({
    description: 'Only lots expiring within this many hours.',
    type: Number,
    minimum: 1,
    maximum: 8760,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'The expiry window must be a whole number of hours.' })
  @Min(1, { message: 'The expiry window must be at least 1 hour.' })
  @Max(8760, { message: 'The expiry window cannot exceed 8760 hours.' })
  expiringWithinHours?: number;

  @ApiPropertyOptional({
    description: 'Only lots expiring within this many days.',
    type: Number,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'The expiry window must be a whole number of days.' })
  @Min(1, { message: 'The expiry window must be at least 1 day.' })
  @Max(365, { message: 'The expiry window cannot exceed 365 days.' })
  expiringWithinDays?: number;

  @ApiPropertyOptional({
    description: 'How to order the list.',
    enum: InventoryItemSort,
    enumName: 'InventoryItemSort',
    default: InventoryItemSort.LISTED_AT_DESC,
  })
  @IsOptional()
  @IsEnum(InventoryItemSort, {
    message: `The sort must be one of: ${Object.values(InventoryItemSort).join(', ')}.`,
  })
  sort?: InventoryItemSort;
}
