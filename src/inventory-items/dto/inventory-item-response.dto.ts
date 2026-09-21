import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DonationReason } from '../../common/enums/donation-reason.enum.js';
import { ProductCategory } from '../../common/enums/product-category.enum.js';
import { SurplusUrgency } from '../../common/enums/surplus-urgency.enum.js';
import { UnitOfMeasure } from '../../common/enums/unit-of-measure.enum.js';
import { expiryView } from '../../common/expiry/expiry.view.js';
import type { InventoryItem } from '../entities/inventory-item.entity.js';
import { InventoryItemStatus } from '../enums/inventory-item-status.enum.js';

/**
 * The catalogue details a lot is displayed by.
 *
 * Flattened onto the lot rather than left as a bare `productId`: every list in
 * both apps shows the name, category and image beside the quantity, and a
 * second round trip per row is what made the demo lists slow.
 */
export class InventoryItemProductDto {
  @ApiProperty({ description: 'The catalogue product.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Product name.', example: 'Sourdough Loaf' })
  name: string;

  @ApiPropertyOptional({ description: 'Brand.', nullable: true })
  brand: string | null;

  @ApiPropertyOptional({ description: 'Barcode.', nullable: true })
  barcode: string | null;

  @ApiProperty({
    description: 'Category the lot is filtered and grouped by.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
  })
  category: ProductCategory;

  @ApiPropertyOptional({
    description: 'Catalogue image, used when the lot has none of its own.',
    nullable: true,
  })
  imageUrl: string | null;

  constructor(init: InventoryItemProductDto) {
    this.id = init.id;
    this.name = init.name;
    this.brand = init.brand;
    this.barcode = init.barcode;
    this.category = init.category;
    this.imageUrl = init.imageUrl;
  }
}

/** API representation of a donatable stock lot. */
export class InventoryItemResponseDto {
  @ApiProperty({ description: 'Unique lot ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Branch holding the stock.', format: 'uuid' })
  locationId: string;

  @ApiProperty({ description: 'What the lot contains.', format: 'uuid' })
  productId: string;

  @ApiPropertyOptional({
    description:
      'Catalogue details, present when the product relation was loaded.',
    type: InventoryItemProductDto,
    nullable: true,
  })
  product: InventoryItemProductDto | null;

  @ApiPropertyOptional({
    description:
      'The image to render: the lot\u2019s own photo, falling back to the catalogue image.',
    nullable: true,
  })
  displayImageUrl: string | null;

  @ApiProperty({ description: 'How much there is.', type: Number, example: 4 })
  quantity: number;

  @ApiProperty({
    description: 'Unit the quantity is counted in.',
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PACK,
  })
  unit: UnitOfMeasure;

  @ApiProperty({
    description: 'Weight of the whole lot.',
    type: Number,
    example: 6,
  })
  weightKg: number;

  @ApiPropertyOptional({
    description: 'Retail value of the whole lot.',
    type: Number,
    nullable: true,
  })
  retailValue: number | null;

  @ApiPropertyOptional({
    description: 'Retail value of a single unit.',
    type: Number,
    nullable: true,
    example: 1.25,
  })
  unitPrice: number | null;

  @ApiPropertyOptional({
    description: 'How the unit is named to staff.',
    nullable: true,
    example: 'bottles',
  })
  unitLabel: string | null;

  @ApiPropertyOptional({
    description: 'Photo of this lot, overriding the catalogue image.',
    nullable: true,
  })
  imageUrl: string | null;

  @ApiProperty({ description: 'Currency of the retail value.', example: 'EUR' })
  currency: string;

  @ApiPropertyOptional({
    description: 'When the lot expires (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  expiresAt: string | null;

  @ApiPropertyOptional({
    description:
      'Hours until expiry, derived rather than stored. Negative once past, null when there is no expiry.',
    type: Number,
    nullable: true,
    example: 4.5,
  })
  hoursRemaining: number | null;

  @ApiPropertyOptional({
    description:
      'Whole days until expiry, derived. Negative once past, null when there is no expiry.',
    type: Number,
    nullable: true,
    example: 1,
  })
  daysRemaining: number | null;

  @ApiPropertyOptional({
    description:
      'How pressing the lot is, derived from the hours remaining. Null when there is no expiry.',
    enum: SurplusUrgency,
    enumName: 'SurplusUrgency',
    nullable: true,
    example: SurplusUrgency.CRITICAL,
  })
  urgency: SurplusUrgency | null;

  @ApiProperty({
    description: 'Why the lot is donatable.',
    enum: DonationReason,
    enumName: 'DonationReason',
    example: DonationReason.NEAR_EXPIRY,
  })
  reason: DonationReason;

  @ApiPropertyOptional({ description: 'Condition notes.', nullable: true })
  reasonDescription: string | null;

  @ApiProperty({
    description: 'Lifecycle state.',
    enum: InventoryItemStatus,
    enumName: 'InventoryItemStatus',
    example: InventoryItemStatus.IN_INVENTORY,
  })
  status: InventoryItemStatus;

  @ApiProperty({
    description: 'Whether the lot is published to the surplus shelf.',
    example: true,
  })
  isListed: boolean;

  @ApiPropertyOptional({
    description: 'Donation this lot is committed to.',
    format: 'uuid',
    nullable: true,
  })
  donationId: string | null;

  @ApiProperty({
    description: 'When the lot was logged (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  listedAt: string;

  @ApiPropertyOptional({
    description: 'When the lot was added to a donation (ISO 8601).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  queuedAt: string | null;

  @ApiProperty({
    description: 'When the lot was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the lot was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps an InventoryItem entity onto its API representation, deriving
   * `daysRemaining` from the stored expiry date.
   * @param data The InventoryItem entity loaded from the database.
   */
  constructor(data: InventoryItem) {
    this.id = data.id;
    this.locationId = data.locationId;
    this.productId = data.productId;
    this.product = data.product
      ? new InventoryItemProductDto({
          id: data.product.id,
          name: data.product.name,
          brand: data.product.brand,
          barcode: data.product.barcode,
          category: data.product.category,
          imageUrl: data.product.imageUrl,
        })
      : null;
    this.displayImageUrl = data.imageUrl ?? data.product?.imageUrl ?? null;
    this.quantity = data.quantity;
    this.unit = data.unit;
    this.weightKg = data.weightKg;
    this.retailValue = data.retailValue;
    this.currency = data.currency;
    this.expiresAt = data.expiresAt ? data.expiresAt.toISOString() : null;

    const expiry = expiryView(data.expiresAt);

    this.hoursRemaining = expiry.hoursRemaining;
    this.daysRemaining = expiry.daysRemaining;
    this.urgency = expiry.urgency;
    this.unitPrice = data.unitPrice;
    this.unitLabel = data.unitLabel;
    this.imageUrl = data.imageUrl;
    this.isListed = data.isListed;
    this.reason = data.reason;
    this.reasonDescription = data.reasonDescription;
    this.status = data.status;
    this.donationId = data.donationId;
    this.listedAt = data.listedAt.toISOString();
    this.queuedAt = data.queuedAt ? data.queuedAt.toISOString() : null;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
