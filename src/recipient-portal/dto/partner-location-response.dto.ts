import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * A store this recipient has actually collected from.
 *
 * Backs the history filter, which the app drove off a store-name string — so two
 * branches sharing a name were indistinguishable.
 */
export class PartnerLocationResponseDto {
  @ApiProperty({ description: 'The store.', format: 'uuid' })
  locationId: string;

  @ApiProperty({ description: 'Store name.', example: 'Mercadona Eixample' })
  label: string;

  @ApiProperty({ description: 'Retailer brand.', example: 'Mercadona' })
  retailerName: string;

  @ApiPropertyOptional({
    description: 'District or neighbourhood.',
    nullable: true,
  })
  neighborhood: string | null;

  @ApiProperty({
    description: 'Collections completed from this store.',
    type: Number,
  })
  pickupCount: number;

  constructor(init: PartnerLocationResponseDto) {
    this.locationId = init.locationId;
    this.label = init.label;
    this.retailerName = init.retailerName;
    this.neighborhood = init.neighborhood;
    this.pickupCount = init.pickupCount;
  }
}
