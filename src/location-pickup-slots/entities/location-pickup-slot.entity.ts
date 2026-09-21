import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import { Location } from '../../locations/entities/location.entity.js';

/**
 * A named collection window a branch offers, which a recipient reserves against.
 *
 * Distinct from `location.pickup_windows`: that JSON says when collections are
 * possible at all, while these are the discrete, addressable slots a claim
 * points at, so a reservation can round-trip instead of carrying prose.
 */
@Entity('location_pickup_slot')
@Check('chk_pickup_slot_weekday', 'weekday IS NULL OR weekday BETWEEN 1 AND 7')
@Check('chk_pickup_slot_times', 'end_time > start_time')
@Index('idx_pickup_slot_location', ['locationId'], {
  where: 'deleted_at IS NULL AND is_active = true',
})
export class LocationPickupSlot extends SoftDeletableEntity {
  @ApiProperty({ description: 'Branch offering the slot.', format: 'uuid' })
  @Column({ name: 'location_id', type: 'uuid' })
  locationId: string;

  @ApiProperty({
    description: 'What the slot is called to both sides.',
    maxLength: 60,
    example: 'Store Close',
  })
  @Column({ name: 'label', type: 'varchar', length: 60 })
  label: string;

  @ApiPropertyOptional({
    description:
      'ISO weekday the slot applies to, 1 = Monday. Null means every day.',
    type: Number,
    minimum: 1,
    maximum: 7,
    nullable: true,
    example: 5,
  })
  @Column({ name: 'weekday', type: 'smallint', nullable: true })
  weekday: number | null;

  @ApiProperty({
    description: "Opening time, local to the branch's timezone.",
    example: '18:30',
  })
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @ApiProperty({
    description: "Closing time, local to the branch's timezone.",
    example: '20:00',
  })
  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @ApiProperty({
    description: 'Whether the slot is currently offered.',
    default: true,
    example: true,
  })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Location, (location) => location.pickupSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'location_id' })
  location?: Relation<Location>;
}
