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

import { AuditedEntity } from '../../common/entities/audited.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Donation } from './donation.entity.js';

/**
 * The QR credential a recipient presents at handover and a retailer scans.
 *
 * Bound to one donation, single-use and expiring — unlike the demo's per-NGO
 * constant, which was reused for every pickup forever. Many rows per donation
 * so a token can be reissued after a failed collection.
 *
 * Like `invalid_token`, this has no soft delete: a token that could be silently
 * filtered out of a lookup would fail open.
 */
@Entity('pickup_token')
@Index('uq_pickup_token_code', ['code'], { unique: true })
@Index('idx_pickup_token_open', ['donationId'], {
  where: 'consumed_at IS NULL',
})
// A keyed-in PIN has to resolve to one donation, so it can only collide with
// tokens already spent. Generation retries on conflict.
@Index('uq_pickup_token_pin_open', ['pin'], {
  unique: true,
  where: 'consumed_at IS NULL',
})
export class PickupToken extends AuditedEntity {
  @ApiProperty({ description: 'Donation this token releases.', format: 'uuid' })
  @Column({ name: 'donation_id', type: 'uuid' })
  donationId: string;

  @ApiProperty({
    description: 'What the QR code encodes.',
    maxLength: 60,
  })
  @Column({ name: 'code', type: 'varchar', length: 60 })
  code: string;

  @ApiProperty({
    description: 'When the token stops being accepted.',
    type: String,
    format: 'date-time',
  })
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @ApiPropertyOptional({
    description: 'When it was scanned. Null means still usable.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Retailer-side user who scanned it.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'consumed_by_user_id', type: 'uuid', nullable: true })
  consumedByUserId: string | null;

  @ApiProperty({
    description:
      'Short numeric code the driver reads out when the QR scan will not work. Same lifetime and single use as the token itself.',
    maxLength: 8,
    example: '482913',
  })
  @Column({ name: 'pin', type: 'varchar', length: 8 })
  pin: string;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Donation, (donation) => donation.pickupTokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'donation_id' })
  donation?: Relation<Donation>;

  @ApiHideProperty()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'consumed_by_user_id' })
  consumedByUser?: Relation<User> | null;
}
