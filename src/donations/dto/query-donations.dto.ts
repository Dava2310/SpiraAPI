import { ApiPropertyOptional } from '@nestjs/swagger';
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

/** Filters for the donation list, used by both apps' history screens. */
export class QueryDonationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Narrow to one lifecycle state.',
    enum: DonationStatus,
    enumName: 'DonationStatus',
  })
  @IsOptional()
  @IsEnum(DonationStatus, {
    message: `The status must be one of: ${Object.values(DonationStatus).join(', ')}.`,
  })
  status?: DonationStatus;

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
