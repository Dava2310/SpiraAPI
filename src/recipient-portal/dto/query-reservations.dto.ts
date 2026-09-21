import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/index.js';
import { DonationStatus } from '../../donations/enums/donation-status.enum.js';
import { ReservationWindow } from './reservation-response.dto.js';

/** Filters for the recipient's reservation list. */
export class QueryReservationsDto extends PaginationQueryDto {
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
    description:
      'Narrow to today, later, or already past. Resolved in the recipient’s timezone.',
    enum: ReservationWindow,
    enumName: 'ReservationWindow',
  })
  @IsOptional()
  @IsEnum(ReservationWindow, {
    message: `The window must be one of: ${Object.values(ReservationWindow).join(', ')}.`,
  })
  window?: ReservationWindow;
}
