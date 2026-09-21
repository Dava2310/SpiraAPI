import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { PartnershipStatus } from '../enums/partnership-status.enum.js';

/** Input for pairing a retailer with a recipient. */
export class CreatePartnershipDto {
  @ApiProperty({ description: 'Retailer side.', format: 'uuid' })
  @IsNotEmpty({ message: 'The retailer ID cannot be empty.' })
  @IsUUID('4', { message: 'The retailer ID must be a valid UUID.' })
  retailerId: string;

  @ApiProperty({ description: 'Recipient side.', format: 'uuid' })
  @IsNotEmpty({ message: 'The recipient ID cannot be empty.' })
  @IsUUID('4', { message: 'The recipient ID must be a valid UUID.' })
  recipientId: string;

  @ApiPropertyOptional({
    description: 'State of the relationship.',
    enum: PartnershipStatus,
    enumName: 'PartnershipStatus',
    default: PartnershipStatus.PENDING,
    example: PartnershipStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PartnershipStatus, {
    message: `The status must be one of: ${Object.values(PartnershipStatus).join(', ')}.`,
  })
  status?: PartnershipStatus;

  @ApiPropertyOptional({
    description:
      'Marks the recipient offered to by default when a manager does not choose.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The preferred flag must be a boolean.' })
  isPreferred?: boolean;

  @ApiPropertyOptional({
    description: 'When the partnership began.',
    format: 'date-time',
    example: '2026-09-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The start date must be a valid ISO 8601 date.' },
  )
  startedAt?: string;
}
