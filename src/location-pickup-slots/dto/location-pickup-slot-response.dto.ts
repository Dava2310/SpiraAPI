import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { LocationPickupSlot } from '../entities/location-pickup-slot.entity.js';

/** API representation of a branch's named collection window. */
export class LocationPickupSlotResponseDto {
  @ApiProperty({ description: 'Unique slot ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Branch offering the slot.', format: 'uuid' })
  locationId: string;

  @ApiProperty({
    description: 'What the slot is called to both sides.',
    example: 'Store Close',
  })
  label: string;

  @ApiPropertyOptional({
    description: 'ISO weekday, 1 = Monday. Null means every day.',
    type: Number,
    nullable: true,
    example: 5,
  })
  weekday: number | null;

  @ApiProperty({ description: 'Opening time, branch-local.', example: '18:30' })
  startTime: string;

  @ApiProperty({ description: 'Closing time, branch-local.', example: '20:00' })
  endTime: string;

  @ApiProperty({
    description: 'The window as one label, for display.',
    example: '18:30 - 20:00',
  })
  windowLabel: string;

  @ApiProperty({ description: 'Whether the slot is currently offered.' })
  isActive: boolean;

  @ApiProperty({
    description: 'When the slot was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the slot was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a LocationPickupSlot entity onto its API representation.
   * @param data The LocationPickupSlot entity loaded from the database.
   */
  constructor(data: LocationPickupSlot) {
    this.id = data.id;
    this.locationId = data.locationId;
    this.label = data.label;
    this.weekday = data.weekday;
    this.startTime = LocationPickupSlotResponseDto.toHoursAndMinutes(
      data.startTime,
    );
    this.endTime = LocationPickupSlotResponseDto.toHoursAndMinutes(
      data.endTime,
    );
    this.windowLabel = `${this.startTime} - ${this.endTime}`;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }

  /**
   * Trims the seconds Postgres returns on a `time` column.
   * @param value The stored time, as `HH:mm:ss`.
   * @returns The same time as `HH:mm`.
   */
  private static toHoursAndMinutes(value: string): string {
    return value.slice(0, 5);
  }
}
