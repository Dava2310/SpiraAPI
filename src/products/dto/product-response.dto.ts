import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductCategory } from '../../common/enums/product-category.enum.js';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum.js';
import type { Product } from '../entities/product.entity.js';

/** API representation of a catalogue product. */
export class ProductResponseDto {
  @ApiProperty({ description: 'Unique product ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Owning retailer.', format: 'uuid' })
  retailerId: string;

  @ApiPropertyOptional({ description: 'Barcode.', nullable: true })
  barcode: string | null;

  @ApiProperty({ description: 'Product name.' })
  name: string;

  @ApiPropertyOptional({ description: 'Manufacturer brand.', nullable: true })
  brand: string | null;

  @ApiPropertyOptional({ description: 'Store department.', nullable: true })
  defaultDepartment: string | null;

  @ApiProperty({
    description: 'Department the product belongs to.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
    example: ProductCategory.DAIRY,
  })
  category: ProductCategory;

  @ApiPropertyOptional({ description: 'Product photo URL.', nullable: true })
  imageUrl: string | null;

  @ApiPropertyOptional({
    description: 'Unit this product is normally counted in.',
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    nullable: true,
  })
  defaultUnit: UnitOfMeasure | null;

  @ApiPropertyOptional({
    description: 'Average weight of one unit.',
    type: Number,
    nullable: true,
  })
  averageUnitWeightKg: number | null;

  @ApiProperty({
    description: 'When the product was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the product was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a Product entity onto its API representation.
   * @param data The Product entity loaded from the database.
   */
  constructor(data: Product) {
    this.id = data.id;
    this.retailerId = data.retailerId;
    this.barcode = data.barcode;
    this.name = data.name;
    this.brand = data.brand;
    this.defaultDepartment = data.defaultDepartment;
    this.category = data.category;
    this.imageUrl = data.imageUrl;
    this.defaultUnit = data.defaultUnit;
    this.averageUnitWeightKg = data.averageUnitWeightKg;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
