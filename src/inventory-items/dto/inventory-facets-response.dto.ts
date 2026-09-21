import { ApiProperty } from '@nestjs/swagger';

import { ProductCategory } from '../../common/enums/product-category.enum.js';
import { SurplusUrgency } from '../../common/enums/surplus-urgency.enum.js';

/**
 * Counts for the filter chips above the inventory list.
 *
 * Deliberately a separate call from the list: the chips show how many lots each
 * category holds regardless of the filter currently applied, so computing them
 * from the filtered result would make every chip read zero but one.
 */
export class InventoryFacetsResponseDto {
  @ApiProperty({
    description: 'How many lots matched the status and branch.',
    type: Number,
  })
  total: number;

  @ApiProperty({
    description:
      'Count per category. Every member is present, including zeros, so the chips do not appear and disappear.',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { BAKERY: 4, DAIRY: 0, PRODUCE: 7 },
  })
  byCategory: Record<ProductCategory, number>;

  @ApiProperty({
    description: 'Count per urgency band, derived from the expiries.',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { CRITICAL: 2, EXPIRING: 3, STANDARD: 6 },
  })
  byUrgency: Record<SurplusUrgency, number>;

  constructor(init: InventoryFacetsResponseDto) {
    this.total = init.total;
    this.byCategory = init.byCategory;
    this.byUrgency = init.byUrgency;
  }
}
