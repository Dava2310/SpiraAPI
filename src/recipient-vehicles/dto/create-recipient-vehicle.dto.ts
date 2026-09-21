import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Input for registering a vehicle a recipient collects with. */
export class CreateRecipientVehicleDto {
  @ApiProperty({ description: 'Owning recipient.', format: 'uuid' })
  @IsNotEmpty({ message: 'The recipient ID cannot be empty.' })
  @IsUUID('4', { message: 'The recipient ID must be a valid UUID.' })
  recipientId: string;

  @ApiProperty({
    description: 'Registration plate, printed on the donation certificate.',
    example: 'NYC-882-FD',
    maxLength: 20,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'The plate cannot be empty.' })
  @IsString({ message: 'The plate must be a string.' })
  @MaxLength(20, { message: 'The plate cannot be longer than 20 characters.' })
  plate: string;

  @ApiPropertyOptional({
    description: 'Free-text description of the vehicle.',
    example: 'White Ford Transit, chilled',
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'The description must be a string.' })
  @MaxLength(120, {
    message: 'The description cannot be longer than 120 characters.',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the load space is refrigerated.',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'The refrigerated flag must be a boolean.' })
  isRefrigerated?: boolean;

  @ApiPropertyOptional({
    description: 'How much it can carry in one trip.',
    example: 750.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'The capacity must be a number with at most 2 decimal places.' },
  )
  @Min(0, { message: 'The capacity cannot be negative.' })
  @Max(99999999.99, { message: 'The capacity cannot exceed 99999999.99.' })
  capacityKg?: number;

  @ApiPropertyOptional({
    description: 'Set to false to retire the vehicle without deleting it.',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'The active flag must be a boolean.' })
  isActive?: boolean;
}
