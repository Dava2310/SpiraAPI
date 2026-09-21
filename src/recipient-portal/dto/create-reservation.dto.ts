import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

/** Where in the NGO app a claim came from, kept for product analytics. */
export enum ReservationSource {
  BROWSE = 'BROWSE',
  PACKAGE = 'PACKAGE',
  AI_RESCUE = 'AI_RESCUE',
}

/**
 * Input for a recipient claiming lots off the surplus shelf.
 *
 * The window is given either as a named slot the store offers or as an explicit
 * pair. A slot is preferred: reserving against a free-text window is what stops
 * a reservation round-tripping.
 */
export class CreateReservationDto {
  @ApiProperty({
    description: 'The store being collected from.',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'The location ID cannot be empty.' })
  @IsUUID('4', { message: 'The location ID must be a valid UUID.' })
  locationId: string;

  @ApiProperty({
    description: 'The lots being claimed. All must be listed and available.',
    type: [String],
    format: 'uuid',
  })
  @IsArray({ message: 'The inventory item IDs must be an array.' })
  @ArrayMinSize(1, { message: 'Claim at least one lot.' })
  @ArrayMaxSize(100, { message: 'At most 100 lots can be claimed at once.' })
  @IsUUID('4', {
    each: true,
    message: 'Every inventory item ID must be a valid UUID.',
  })
  inventoryItemIds: string[];

  @ApiPropertyOptional({
    description:
      'The named slot to collect in. Give this or both window bounds.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The pickup slot ID must be a valid UUID.' })
  pickupSlotId?: string;

  @ApiPropertyOptional({
    description: 'Start of an explicit collection window.',
    format: 'date-time',
  })
  @ValidateIf((dto: CreateReservationDto) => !dto.pickupSlotId)
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The pickup window start must be a valid ISO 8601 date.' },
  )
  pickupWindowStart?: string;

  @ApiPropertyOptional({
    description: 'End of an explicit collection window.',
    format: 'date-time',
  })
  @ValidateIf((dto: CreateReservationDto) => !dto.pickupSlotId)
  @IsOptional()
  @IsDateString(
    {},
    { message: 'The pickup window end must be a valid ISO 8601 date.' },
  )
  pickupWindowEnd?: string;

  @ApiPropertyOptional({
    description: 'Which entry point the claim came from.',
    enum: ReservationSource,
    enumName: 'ReservationSource',
  })
  @IsOptional()
  @IsEnum(ReservationSource, {
    message: `The source must be one of: ${Object.values(ReservationSource).join(', ')}.`,
  })
  source?: ReservationSource;

  @ApiPropertyOptional({
    description: 'Who will collect, when it is already known.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The driver contact ID must be a valid UUID.' })
  driverContactId?: string;

  @ApiPropertyOptional({
    description: 'Vehicle that will collect, when it is already known.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The vehicle ID must be a valid UUID.' })
  recipientVehicleId?: string;
}
