import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import {
  PRODUCT_CATEGORY_ENUM_NAME,
  ProductCategory,
} from '../../common/enums/product-category.enum.js';
import {
  UNIT_OF_MEASURE_ENUM_NAME,
  UnitOfMeasure,
} from '../../common/enums/unit-of-measure.enum.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity.js';
import { Retailer } from '../../retailers/entities/retailer.entity.js';

/** A catalogue entry identifying what a retailer stocks, so logging the same article twice does not duplicate its description. */
@Entity('product')
@Index('uq_product_barcode', ['retailerId', 'barcode'], {
  unique: true,
  where: 'deleted_at IS NULL AND barcode IS NOT NULL',
})
@Index('idx_product_retailer_category', ['retailerId', 'category'], {
  where: 'deleted_at IS NULL',
})
export class Product extends SoftDeletableEntity {
  @ApiProperty({ description: 'Owning retailer.', format: 'uuid' })
  @Column({ name: 'retailer_id', type: 'uuid' })
  retailerId: string;

  @ApiPropertyOptional({
    description:
      'EAN-13 or GTIN-14 barcode. Unique per retailer when set, and null for unbarcoded goods such as loose produce.',
    maxLength: 14,
    nullable: true,
    example: '8690504123456',
  })
  @Column({ name: 'barcode', type: 'varchar', length: 14, nullable: true })
  barcode: string | null;

  @ApiProperty({
    description: 'Product name as it appears to staff and on the certificate.',
    maxLength: 200,
    example: 'Organic Whole Milk 1 Gal (4-Pack)',
  })
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @ApiPropertyOptional({
    description: 'Manufacturer brand.',
    maxLength: 120,
    nullable: true,
    example: 'Horizon Organic',
  })
  @Column({ name: 'brand', type: 'varchar', length: 120, nullable: true })
  brand: string | null;

  @ApiPropertyOptional({
    description:
      'Store department, kept separate from the brand so own-label goods do not overload it.',
    maxLength: 120,
    nullable: true,
    example: 'In-Store Bakery',
  })
  @Column({
    name: 'default_department',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  defaultDepartment: string | null;

  @ApiProperty({
    description: 'Department the product belongs to.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
    example: ProductCategory.DAIRY,
  })
  @Column({
    name: 'category',
    type: 'enum',
    enum: ProductCategory,
    enumName: PRODUCT_CATEGORY_ENUM_NAME,
  })
  category: ProductCategory;

  @ApiPropertyOptional({
    description: 'Absolute URL of the product photo.',
    maxLength: 500,
    nullable: true,
  })
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @ApiPropertyOptional({
    description: 'Unit this product is normally counted in.',
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    nullable: true,
    example: UnitOfMeasure.PACK,
  })
  @Column({
    name: 'default_unit',
    type: 'enum',
    enum: UnitOfMeasure,
    enumName: UNIT_OF_MEASURE_ENUM_NAME,
    nullable: true,
  })
  defaultUnit: UnitOfMeasure | null;

  @ApiPropertyOptional({
    description:
      'Average weight of one unit, used to suggest a lot weight when staff do not weigh it.',
    type: Number,
    nullable: true,
    example: 1.5,
  })
  @Column({
    name: 'average_unit_weight_kg',
    type: 'numeric',
    precision: 8,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  averageUnitWeightKg: number | null;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Retailer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_id' })
  retailer?: Relation<Retailer>;

  @ApiHideProperty()
  @OneToMany(() => InventoryItem, (item) => item.product)
  inventoryItems?: Relation<InventoryItem>[];
}
