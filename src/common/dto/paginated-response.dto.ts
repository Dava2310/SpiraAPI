import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Where a list ends and whether there is more of it. */
export class PageMetaDto {
  @ApiProperty({
    description: 'How many records matched, ignoring the page size.',
    type: Number,
  })
  total: number;

  @ApiProperty({
    description: 'How many records this page holds.',
    type: Number,
  })
  count: number;

  @ApiPropertyOptional({
    type: String,
    description:
      'Pass as `cursor` to fetch the next page. Null on the last page.',
    nullable: true,
  })
  nextCursor: string | null;

  constructor(init: PageMetaDto) {
    this.total = init.total;
    this.count = init.count;
    this.nextCursor = init.nextCursor;
  }
}

/**
 * One page of records plus its metadata.
 *
 * Generic so each module can declare the item type for Swagger via
 * `ApiExtraModels` and an explicit `data` schema on the route.
 */
export class PaginatedResponseDto<TItem> {
  data: TItem[];

  @ApiProperty({ description: 'Paging metadata.', type: PageMetaDto })
  meta: PageMetaDto;

  constructor(data: TItem[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
