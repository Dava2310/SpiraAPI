import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { Recipient } from '../../recipients/entities/recipient.entity.js';

/**
 * A vehicle a recipient collects with.
 *
 * Refrigeration and capacity live here rather than on the recipient, because a
 * fleet is mixed: one van may be chilled and another not.
 */
@Entity('recipient_vehicle')
@Index('uq_recipient_vehicle_plate', ['recipientId', 'plate'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_recipient_vehicle_recipient', ['recipientId'])
export class RecipientVehicle extends SoftDeletableEntity {
  @ApiProperty({ description: 'Owning recipient.', format: 'uuid' })
  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ApiProperty({
    description: 'Registration plate, printed on the donation certificate.',
    maxLength: 20,
    example: 'NYC-882-FD',
  })
  @Column({ name: 'plate', type: 'varchar', length: 20 })
  plate: string;

  @ApiPropertyOptional({
    description: 'Free-text description of the vehicle.',
    maxLength: 120,
    nullable: true,
    example: 'White Ford Transit, chilled',
  })
  @Column({ name: 'description', type: 'varchar', length: 120, nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'Whether the load space is refrigerated.',
    default: false,
    example: false,
  })
  @Column({ name: 'is_refrigerated', type: 'boolean', default: false })
  isRefrigerated: boolean;

  @ApiPropertyOptional({
    description: 'How much it can carry in one trip.',
    type: Number,
    nullable: true,
    example: 750.5,
  })
  @Column({
    name: 'capacity_kg',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  capacityKg: number | null;

  @ApiProperty({
    description: 'Set to false to retire the vehicle without deleting it.',
    default: true,
    example: true,
  })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Recipient, (recipient) => recipient.vehicles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Relation<Recipient>;
}
