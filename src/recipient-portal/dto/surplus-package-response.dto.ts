import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductCategory } from '../../common/enums/product-category.enum.js';
import { SurplusUrgency } from '../../common/enums/surplus-urgency.enum.js';

/**
 * One store on the surplus shelf, with the availability summary its map marker
 * and list row both need.
 *
 * Deliberately an aggregate rather than a store plus a list of lots: the NGO map
 * renders one marker per store carrying counts and the highest urgency, and
 * fetching the lots per marker is the N+1 the demo avoided only by having all
 * its data in memory.
 */
export class SurplusPackageResponseDto {
  @ApiProperty({ description: 'The store.', format: 'uuid' })
  locationId: string;

  @ApiProperty({ description: 'Store name.', example: 'Mercadona Eixample' })
  label: string;

  @ApiProperty({ description: 'The retailer it belongs to.', format: 'uuid' })
  retailerId: string;

  @ApiProperty({ description: 'Retailer brand.', example: 'Mercadona' })
  retailerName: string;

  @ApiPropertyOptional({ description: 'Retailer logo.', nullable: true })
  logoUrl: string | null;

  @ApiPropertyOptional({
    description: 'How the branch describes itself.',
    nullable: true,
    example: 'Organic Grocery & Fresh Market',
  })
  storeFormat: string | null;

  @ApiPropertyOptional({
    description: 'District or neighbourhood.',
    nullable: true,
    example: 'Eixample',
  })
  neighborhood: string | null;

  @ApiProperty({ description: 'City.', example: 'Barcelona' })
  city: string;

  @ApiProperty({ description: 'Street address.' })
  address: string;

  @ApiPropertyOptional({ description: 'Store phone.', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({
    description: 'Latitude, for the map marker.',
    type: Number,
    nullable: true,
  })
  latitude: number | null;

  @ApiPropertyOptional({
    description: 'Longitude, for the map marker.',
    type: Number,
    nullable: true,
  })
  longitude: number | null;

  @ApiPropertyOptional({
    description:
      'Great-circle distance from the search origin, in kilometres. Computed per request, never stored.',
    type: Number,
    nullable: true,
    example: 1.4,
  })
  distanceKm: number | null;

  @ApiProperty({ description: 'Whether the retailer is verified.' })
  isVerified: boolean;

  @ApiProperty({
    description: 'How many lots are claimable here.',
    type: Number,
  })
  availableCount: number;

  @ApiProperty({
    description: 'Total units across those lots.',
    type: Number,
  })
  totalQuantity: number;

  @ApiProperty({ description: 'Their combined weight.', type: Number })
  totalWeightKg: number;

  @ApiProperty({ description: 'Their combined retail value.', type: Number })
  totalValue: number;

  @ApiProperty({ description: 'Currency of the value.', example: 'EUR' })
  currency: string;

  @ApiProperty({
    description: 'Meals that weight represents.',
    type: Number,
  })
  estimatedMeals: number;

  @ApiProperty({
    description: 'Categories present here.',
    enum: ProductCategory,
    enumName: 'ProductCategory',
    isArray: true,
  })
  categories: ProductCategory[];

  @ApiProperty({
    description: 'Categories with their counts, for the marker tooltip.',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { BAKERY: 3, DAIRY: 1 },
  })
  categorySummary: Record<string, number>;

  @ApiPropertyOptional({
    description: 'The most pressing urgency present.',
    enum: SurplusUrgency,
    enumName: 'SurplusUrgency',
    nullable: true,
  })
  highestUrgency: SurplusUrgency | null;

  @ApiPropertyOptional({
    description: 'Hours until the soonest expiry here.',
    type: Number,
    nullable: true,
    example: 4.5,
  })
  earliestExpiryHoursLeft: number | null;

  @ApiPropertyOptional({
    description:
      "Today's collection windows at this store, as labels. Derived from the store's slots.",
    type: [String],
    nullable: true,
    example: ['18:30 - 20:00'],
  })
  pickupHoursToday: string[];

  constructor(init: SurplusPackageResponseDto) {
    Object.assign(this, init);
  }
}

/** Counts for the shelf's badge, which must not silently reflect the filters. */
export class SurplusPackagesMetaDto {
  @ApiProperty({
    description: 'Claimable lots in range, ignoring every other filter.',
    type: Number,
  })
  totalPackages: number;

  @ApiProperty({
    description: 'Claimable lots that matched the filters.',
    type: Number,
  })
  filteredPackages: number;

  @ApiProperty({ description: 'Stores returned on this page.', type: Number })
  count: number;

  @ApiProperty({ description: 'Stores matching the filters.', type: Number })
  total: number;

  @ApiPropertyOptional({
    description: 'Pass as `cursor` for the next page.',
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({
    description: 'Radius the search actually used, in kilometres.',
    type: Number,
  })
  radiusKm: number;

  @ApiPropertyOptional({
    description: 'Origin the distances were measured from.',
    type: Number,
    nullable: true,
  })
  originLatitude: number | null;

  @ApiPropertyOptional({
    description: 'Origin the distances were measured from.',
    type: Number,
    nullable: true,
  })
  originLongitude: number | null;

  constructor(init: SurplusPackagesMetaDto) {
    Object.assign(this, init);
  }
}

/** The surplus shelf: one page of stores plus the counts behind the badge. */
export class SurplusPackagesResponseDto {
  @ApiProperty({
    description: 'The stores on this page.',
    type: [SurplusPackageResponseDto],
  })
  data: SurplusPackageResponseDto[];

  @ApiProperty({
    description: 'Paging and counts.',
    type: SurplusPackagesMetaDto,
  })
  meta: SurplusPackagesMetaDto;

  constructor(data: SurplusPackageResponseDto[], meta: SurplusPackagesMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
