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
import { Recipient } from '../../recipients/entities/recipient.entity.js';
import { Retailer } from '../../retailers/entities/retailer.entity.js';
import {
  PARTNERSHIP_STATUS_ENUM_NAME,
  PartnershipStatus,
} from '../enums/partnership-status.enum.js';

/**
 * A working relationship between a retailer and a recipient.
 *
 * This is the list a manager picks from when offering a donation, which is what
 * replaces the demo's hardcoded first-NGO-in-the-array.
 */
@Entity('retailer_recipient_partnership')
@Index('uq_partnership_pair', ['retailerId', 'recipientId'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_partnership_retailer', ['retailerId', 'status'], {
  where: 'deleted_at IS NULL',
})
@Index('idx_partnership_recipient', ['recipientId', 'status'], {
  where: 'deleted_at IS NULL',
})
export class Partnership extends SoftDeletableEntity {
  @ApiProperty({ description: 'Retailer side.', format: 'uuid' })
  @Column({ name: 'retailer_id', type: 'uuid' })
  retailerId: string;

  @ApiProperty({ description: 'Recipient side.', format: 'uuid' })
  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ApiProperty({
    description: 'State of the relationship.',
    enum: PartnershipStatus,
    enumName: 'PartnershipStatus',
    default: PartnershipStatus.PENDING,
    example: PartnershipStatus.ACTIVE,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: PartnershipStatus,
    enumName: PARTNERSHIP_STATUS_ENUM_NAME,
    default: PartnershipStatus.PENDING,
  })
  status: PartnershipStatus;

  @ApiProperty({
    description:
      'Marks the recipient offered to by default when a manager does not choose.',
    default: false,
    example: false,
  })
  @Column({ name: 'is_preferred', type: 'boolean', default: false })
  isPreferred: boolean;

  @ApiPropertyOptional({
    description: 'When the partnership began.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Retailer, (retailer) => retailer.partnerships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'retailer_id' })
  retailer?: Relation<Retailer>;

  @ApiHideProperty()
  @ManyToOne(() => Recipient, (recipient) => recipient.partnerships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Relation<Recipient>;
}
