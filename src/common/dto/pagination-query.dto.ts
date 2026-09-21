import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 200;

/**
 * Cursor pagination, shared by every list endpoint.
 *
 * Both frontends fetched unbounded lists and reduced them client-side, so every
 * list here is bounded by default even when the caller asks for nothing.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: `How many records to return. Defaults to ${DEFAULT_PAGE_SIZE}.`,
    type: Number,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'The limit must be a whole number.' })
  @Min(1, { message: 'The limit must be at least 1.' })
  @Max(MAX_PAGE_SIZE, { message: `The limit cannot exceed ${MAX_PAGE_SIZE}.` })
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Opaque cursor from the previous page’s `meta.nextCursor`. Omit for the first page.',
  })
  @IsOptional()
  @IsString({ message: 'The cursor must be a string.' })
  cursor?: string;
}
