import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { RecipientVehicle } from '../entities/recipient-vehicle.entity.js';

/** API representation of a recipient's vehicle. */
export class RecipientVehicleResponseDto {
  @ApiProperty({ description: 'Unique vehicle ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Owning recipient.', format: 'uuid' })
  recipientId: string;

  @ApiProperty({ description: 'Registration plate.', example: 'NYC-882-FD' })
  plate: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Vehicle description.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: 'Whether the load space is refrigerated.' })
  isRefrigerated: boolean;

  @ApiPropertyOptional({
    description: 'How much it can carry in one trip.',
    type: Number,
    nullable: true,
  })
  capacityKg: number | null;

  @ApiProperty({ description: 'Whether the vehicle is still in service.' })
  isActive: boolean;

  @ApiProperty({
    description: 'When the vehicle was registered (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the vehicle was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a RecipientVehicle entity onto its API representation.
   * @param data The RecipientVehicle entity loaded from the database.
   */
  constructor(data: RecipientVehicle) {
    this.id = data.id;
    this.recipientId = data.recipientId;
    this.plate = data.plate;
    this.description = data.description;
    this.isRefrigerated = data.isRefrigerated;
    this.capacityKg = data.capacityKg;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
