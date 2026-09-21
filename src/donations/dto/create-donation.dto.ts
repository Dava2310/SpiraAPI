import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * Input for opening a donation as a `DRAFT`.
 *
 * Status, totals and every timestamp are absent on purpose: the lifecycle is
 * driven by the transition endpoints, not by a caller setting fields.
 */
export class CreateDonationDto {
  @ApiProperty({ description: 'Donating retailer.', format: 'uuid' })
  @IsNotEmpty({ message: 'The retailer ID cannot be empty.' })
  @IsUUID('4', { message: 'The retailer ID must be a valid UUID.' })
  retailerId: string;

  @ApiProperty({
    description: 'Branch the stock is collected from.',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'The location ID cannot be empty.' })
  @IsUUID('4', { message: 'The location ID must be a valid UUID.' })
  locationId: string;

  @ApiProperty({
    description: "Receiving recipient, chosen from the retailer's partners.",
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'The recipient ID cannot be empty.' })
  @IsUUID('4', { message: 'The recipient ID must be a valid UUID.' })
  recipientId: string;

  @ApiPropertyOptional({
    description:
      'Proposed collection time, confirmed when the recipient accepts.',
    format: 'date-time',
    example: '2026-09-18T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The scheduled pickup time must be a valid ISO 8601 date.' },
  )
  scheduledPickupAt?: string;

  @ApiPropertyOptional({
    description:
      'Stock lots to put in the donation straight away. Each becomes a line and is reserved.',
    type: [String],
    format: 'uuid',
    example: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  })
  @IsOptional()
  @IsArray({ message: 'The inventory item IDs must be an array.' })
  @ArrayUnique({ message: 'The inventory item IDs cannot contain duplicates.' })
  @ArrayMaxSize(200, { message: 'At most 200 stock lots are allowed.' })
  @IsUUID('4', {
    each: true,
    message: 'Each inventory item ID must be a valid UUID.',
  })
  inventoryItemIds?: string[];
}
