import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/index.js';
import { DonationOrigin } from '../enums/donation-origin.enum.js';
import { DonationStatus } from '../enums/donation-status.enum.js';

/** How the donation list may be ordered. */
export enum DonationSort {
  COMPLETED_AT_DESC = 'completedAt:desc',
  CREATED_AT_DESC = 'createdAt:desc',
  PICKUP_WINDOW_ASC = 'pickupWindowStart:asc',
}

/**
 * Normalises a status query parameter into an array.
 *
 * Accepts `?status=A&status=B` and `?status=A,B` alike, because the two are
 * indistinguishable to someone reading the docs and both are common in the wild.
 * @param value The raw query value.
 * @returns The statuses, or the value untouched when there is nothing to split.
 */
function toStatusArray(value: unknown): unknown {
  const parts = (Array.isArray(value) ? value : [value])
    .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : entry))
    .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
    .filter((entry) => entry !== '');

  return parts.length > 0 ? parts : undefined;
}

/** Filters for the donation list, used by both apps' history screens. */
export class QueryDonationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Narrow to one or more lifecycle states. Repeat the parameter or give a comma-separated list — the retailer queue is several states at once, since a batch being staged, offered and awaiting collection is one list to the shop.',
    enum: DonationStatus,
    enumName: 'DonationStatus',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toStatusArray(value))
  @IsEnum(DonationStatus, {
    each: true,
    message: `Each status must be one of: ${Object.values(DonationStatus).join(', ')}.`,
  })
  status?: DonationStatus[];

  @ApiPropertyOptional({
    description: 'Narrow to one side having started it.',
    enum: DonationOrigin,
    enumName: 'DonationOrigin',
  })
  @IsOptional()
  @IsEnum(DonationOrigin, {
    message: `The origin must be one of: ${Object.values(DonationOrigin).join(', ')}.`,
  })
  origin?: DonationOrigin;

  @ApiPropertyOptional({ description: 'Narrow to one branch.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'The location ID must be a valid UUID.' })
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Narrow to one recipient.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The recipient ID must be a valid UUID.' })
  recipientId?: string;

  @ApiPropertyOptional({
    description: 'Inclusive lower bound on when the donation was created.',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The `from` bound must be a valid ISO 8601 date.' },
  )
  from?: string;

  @ApiPropertyOptional({
    description: 'Exclusive upper bound on when the donation was created.',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The `to` bound must be a valid ISO 8601 date.' },
  )
  to?: string;

  @ApiPropertyOptional({
    description: 'How to order the list.',
    enum: DonationSort,
    enumName: 'DonationSort',
    default: DonationSort.CREATED_AT_DESC,
  })
  @IsOptional()
  @IsEnum(DonationSort, {
    message: `The sort must be one of: ${Object.values(DonationSort).join(', ')}.`,
  })
  sort?: DonationSort;
}
