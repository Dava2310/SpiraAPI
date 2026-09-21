import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Input for offering a named collection window at a branch. */
export class CreateLocationPickupSlotDto {
  @ApiProperty({ description: 'Branch offering the slot.', format: 'uuid' })
  @IsNotEmpty({ message: 'The location ID cannot be empty.' })
  @IsUUID('4', { message: 'The location ID must be a valid UUID.' })
  locationId: string;

  @ApiProperty({
    description: 'What the slot is called to both sides.',
    example: 'Store Close',
    maxLength: 60,
  })
  @IsNotEmpty({ message: 'The label cannot be empty.' })
  @IsString({ message: 'The label must be a string.' })
  @MaxLength(60, { message: 'The label cannot be longer than 60 characters.' })
  label: string;

  @ApiPropertyOptional({
    description: 'ISO weekday the slot applies to, 1 = Monday. Omit for daily.',
    example: 5,
    minimum: 1,
    maximum: 7,
  })
  @IsOptional()
  @IsInt({ message: 'The weekday must be a whole number.' })
  @Min(1, { message: 'The weekday must be between 1 and 7.' })
  @Max(7, { message: 'The weekday must be between 1 and 7.' })
  weekday?: number;

  @ApiProperty({
    description: "Opening time, local to the branch's timezone.",
    example: '18:30',
  })
  @IsNotEmpty({ message: 'The start time cannot be empty.' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'The start time must use the 24-hour format HH:mm.',
  })
  startTime: string;

  @ApiProperty({
    description: "Closing time, local to the branch's timezone.",
    example: '20:00',
  })
  @IsNotEmpty({ message: 'The end time cannot be empty.' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'The end time must use the 24-hour format HH:mm.',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Whether the slot is currently offered.',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'The active flag must be a boolean.' })
  isActive?: boolean;
}
