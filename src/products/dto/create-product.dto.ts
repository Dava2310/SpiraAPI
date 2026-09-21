import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { ProductCategory } from '../../common/enums/product-category.enum.js';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum.js';

/** Input for adding a product to a retailer's catalogue. */
export class CreateProductDto {
  @ApiProperty({ description: 'Owning retailer.', format: 'uuid' })
  @IsNotEmpty({ message: 'The retailer ID cannot be empty.' })
  @IsUUID('4', { message: 'The retailer ID must be a valid UUID.' })
  retailerId: string;

  @ApiPropertyOptional({
    description:
      'EAN-13 or GTIN-14 barcode. Unique per retailer. Omit for unbarcoded goods such as loose produce.',
    example: '8690504123456',
    maxLength: 14,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^\d{8}$|^\d{12,14}$/, {
    message: 'The barcode must be 8, 12, 13 or 14 digits.',
  })
  barcode?: string;

  @ApiProperty({
    description: 'Product name, as it appears to staff and on the certificate.',
    example: 'Organic Whole Milk 1 Gal (4-Pack)',
    minLength: 2,
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'The name cannot be empty.' })
  @IsString({ message: 'The name must be a string.' })
  @MinLength(2, { message: 'The name must be at least 2 characters long.' })
  @MaxLength(200, { message: 'The name cannot be longer than 200 characters.' })
  name: string;

  @ApiPropertyOptional({
    description: 'Manufacturer brand.',
    example: 'Horizon Organic',
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'The brand must be a string.' })
  @MaxLength(120, {
    message: 'The brand cannot be longer than 120 characters.',
  })
  brand?: string;

  @ApiPropertyOptional({
    description: 'Store department, kept separate from the brand.',
    example: 'In-Store Bakery',
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'The department must be a string.' })
  @MaxLength(120, {
    message: 'The department cannot be longer than 120 characters.',
  })
  defaultDepartment?: string;

  @ApiProperty({
    description: 'Department the product belongs to.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
    example: ProductCategory.DAIRY,
  })
  @IsNotEmpty({ message: 'The category cannot be empty.' })
  @IsEnum(ProductCategory, {
    message: `The category must be one of: ${Object.values(ProductCategory).join(', ')}.`,
  })
  category: ProductCategory;

  @ApiPropertyOptional({
    description: 'Absolute URL of the product photo.',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl({}, { message: 'The image URL must be a valid URL.' })
  @MaxLength(500, {
    message: 'The image URL cannot be longer than 500 characters.',
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Unit this product is normally counted in.',
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PACK,
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure, {
    message: `The default unit must be one of: ${Object.values(UnitOfMeasure).join(', ')}.`,
  })
  defaultUnit?: UnitOfMeasure;

  @ApiPropertyOptional({
    description:
      'Average weight of one unit, used to suggest a lot weight when staff do not weigh it.',
    example: 1.5,
    minimum: 0,
    maximum: 99999.999,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 3 },
    {
      message:
        'The average unit weight must be a number with at most 3 decimal places.',
    },
  )
  @Min(0, { message: 'The average unit weight cannot be negative.' })
  @Max(99999.999, {
    message: 'The average unit weight cannot exceed 99999.999.',
  })
  averageUnitWeightKg?: number;
}
