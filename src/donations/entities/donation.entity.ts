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
  OneToMany,
  OneToOne,
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { Contact } from '../../contacts/entities/contact.entity.js';
import { DonationReceipt } from '../../donation-receipts/entities/donation-receipt.entity.js';
import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { RecipientVehicle } from '../../recipient-vehicles/entities/recipient-vehicle.entity.js';
import { Recipient } from '../../recipients/entities/recipient.entity.js';
import { Retailer } from '../../retailers/entities/retailer.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  DONATION_STATUS_ENUM_NAME,
  DonationStatus,
} from '../enums/donation-status.enum.js';
import { DonationLine } from './donation-line.entity.js';
import { PickupToken } from './pickup-token.entity.js';

/**
 * One handover of surplus stock from a retailer branch to a recipient.
 *
 * Both sides move it: the retailer offers and stages, the recipient accepts,
 * declines and sets off. Totals are recomputed from {@link DonationLine} while
 * the donation is open and frozen once it is `DELIVERED`, because a certificate
 * has been issued against them.
 */
@Entity('donation')
@Check(
  'chk_donation_completed',
  "(status = 'DELIVERED') = (completed_at IS NOT NULL)",
)
@Check(
  'chk_donation_accepted',
  '(accepted_at IS NULL) = (accepted_by_user_id IS NULL)',
)
@Check(
  'chk_donation_decision',
  'NOT (accepted_at IS NOT NULL AND declined_at IS NOT NULL)',
)
@Index('uq_donation_code', ['code'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_donation_location_status', ['locationId', 'status', 'createdAt'], {
  where: 'deleted_at IS NULL',
})
// The recipient app's inbox: what has been offered to us, newest first.
@Index(
  'idx_donation_recipient_status',
  ['recipientId', 'status', 'createdAt'],
  {
    where: 'deleted_at IS NULL',
  },
)
export class Donation extends SoftDeletableEntity {
  @ApiProperty({
    description: 'Human-readable reference, shown to both parties.',
    maxLength: 30,
    example: 'FR-2026-000402',
  })
  @Column({ name: 'code', type: 'varchar', length: 30 })
  code: string;

  @ApiProperty({ description: 'Donating retailer.', format: 'uuid' })
  @Column({ name: 'retailer_id', type: 'uuid' })
  retailerId: string;

  @ApiProperty({
    description: 'Branch the stock is collected from.',
    format: 'uuid',
  })
  @Column({ name: 'location_id', type: 'uuid' })
  locationId: string;

  @ApiProperty({ description: 'Receiving recipient.', format: 'uuid' })
  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ApiProperty({
    description: 'Lifecycle state.',
    enum: DonationStatus,
    enumName: 'DonationStatus',
    default: DonationStatus.DRAFT,
    example: DonationStatus.OFFERED,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: DonationStatus,
    enumName: DONATION_STATUS_ENUM_NAME,
    default: DonationStatus.DRAFT,
  })
  status: DonationStatus;

  // --- Parties collecting ---

  @ApiPropertyOptional({
    description: 'Vehicle the recipient will collect with.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'recipient_vehicle_id', type: 'uuid', nullable: true })
  recipientVehicleId: string | null;

  @ApiPropertyOptional({
    description:
      'Person collecting. Supplies the driver name printed on the certificate.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'driver_contact_id', type: 'uuid', nullable: true })
  driverContactId: string | null;

  // --- Negotiation ---

  @ApiPropertyOptional({
    description: 'Retailer-side user who created the donation.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ApiPropertyOptional({
    description: 'When the retailer offered it to the recipient.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'offered_at', type: 'timestamptz', nullable: true })
  offeredAt: Date | null;

  @ApiPropertyOptional({
    description: 'Recipient-side user who accepted.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'accepted_by_user_id', type: 'uuid', nullable: true })
  acceptedByUserId: string | null;

  @ApiPropertyOptional({
    description: 'When the recipient accepted.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @ApiPropertyOptional({
    description: 'When the recipient declined.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'declined_at', type: 'timestamptz', nullable: true })
  declinedAt: Date | null;

  @ApiPropertyOptional({
    description:
      'Why the recipient declined. The retailer needs this to re-offer elsewhere.',
    nullable: true,
    example: 'No cold storage available before Thursday.',
  })
  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason: string | null;

  // --- Handover ---

  @ApiPropertyOptional({
    description:
      'Agreed collection time. Proposed by the retailer, confirmed on accept.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'scheduled_pickup_at', type: 'timestamptz', nullable: true })
  scheduledPickupAt: Date | null;

  @ApiPropertyOptional({
    description:
      "Retailer-side user who scanned the pickup token. The certificate's authorising signatory.",
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'confirmed_by_user_id', type: 'uuid', nullable: true })
  confirmedByUserId: string | null;

  @ApiPropertyOptional({
    description: 'When the handover completed. Set once, never changed.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ApiPropertyOptional({
    description: 'When the donation was cancelled by either side.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @ApiPropertyOptional({
    description: 'Why it was cancelled. Covers a driver no-show.',
    nullable: true,
  })
  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  // --- Totals, recomputed from the lines until DELIVERED ---

  @ApiProperty({ description: 'Number of lines.', type: Number, default: 0 })
  @Column({ name: 'line_count', type: 'smallint', default: 0 })
  lineCount: number;

  @ApiProperty({
    description: 'Total weight of every line.',
    type: Number,
    default: 0,
    example: 18.3,
  })
  @Column({
    name: 'total_weight_kg',
    type: 'numeric',
    precision: 12,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  totalWeightKg: number;

  @ApiProperty({
    description: 'Total retail value of every line.',
    type: Number,
    default: 0,
    example: 98,
  })
  @Column({
    name: 'total_retail_value',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  totalRetailValue: number;

  @ApiProperty({
    description: 'Currency of the totals, as an ISO 4217 code.',
    minLength: 3,
    maxLength: 3,
    default: 'USD',
    example: 'USD',
  })
  @Column({ name: 'currency', type: 'char', length: 3, default: 'USD' })
  currency: string;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Retailer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_id' })
  retailer?: Relation<Retailer>;

  @ApiHideProperty()
  @ManyToOne(() => Location, (location) => location.donations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'location_id' })
  location?: Relation<Location>;

  /** `RESTRICT`: never delete a recipient out from under a donation record. */
  @ApiHideProperty()
  @ManyToOne(() => Recipient, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Relation<Recipient>;

  @ApiHideProperty()
  @ManyToOne(() => RecipientVehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recipient_vehicle_id' })
  recipientVehicle?: Relation<RecipientVehicle> | null;

  @ApiHideProperty()
  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_contact_id' })
  driverContact?: Relation<Contact> | null;

  @ApiHideProperty()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: Relation<User> | null;

  @ApiHideProperty()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accepted_by_user_id' })
  acceptedByUser?: Relation<User> | null;

  @ApiHideProperty()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confirmed_by_user_id' })
  confirmedByUser?: Relation<User> | null;

  @ApiHideProperty()
  @OneToMany(() => DonationLine, (line) => line.donation)
  lines?: Relation<DonationLine>[];

  @ApiHideProperty()
  @OneToMany(() => InventoryItem, (item) => item.donation)
  inventoryItems?: Relation<InventoryItem>[];

  @ApiHideProperty()
  @OneToMany(() => PickupToken, (token) => token.donation)
  pickupTokens?: Relation<PickupToken>[];

  @ApiHideProperty()
  @OneToOne(() => DonationReceipt, (receipt) => receipt.donation)
  receipt?: Relation<DonationReceipt> | null;
}
