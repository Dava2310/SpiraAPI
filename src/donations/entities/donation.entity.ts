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
import { ImpactFactor } from '../../impact-factors/entities/impact-factor.entity.js';
import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity.js';
import { LocationPickupSlot } from '../../location-pickup-slots/entities/location-pickup-slot.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { RecipientVehicle } from '../../recipient-vehicles/entities/recipient-vehicle.entity.js';
import { Recipient } from '../../recipients/entities/recipient.entity.js';
import { Retailer } from '../../retailers/entities/retailer.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  CANCELLATION_REASON_CODE_ENUM_NAME,
  CancellationReasonCode,
} from '../enums/cancellation-reason-code.enum.js';
import {
  DONATION_ORIGIN_ENUM_NAME,
  DonationOrigin,
} from '../enums/donation-origin.enum.js';
import {
  DONATION_STATUS_ENUM_NAME,
  DonationStatus,
} from '../enums/donation-status.enum.js';
import { DonationLine } from './donation-line.entity.js';
import { PickupToken } from './pickup-token.entity.js';

/**
 * One handover of surplus stock from a retailer branch to a recipient.
 *
 * Reached from either direction — see {@link DonationOrigin}. Both sides then
 * move it: the retailer offers and stages, the recipient accepts, declines and
 * sets off. Totals are recomputed from {@link DonationLine} while the donation
 * is open and frozen once it is `DELIVERED`, because a certificate has been
 * issued against them.
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
@Check(
  'chk_donation_pickup_window',
  'pickup_window_start IS NULL OR pickup_window_end IS NULL OR pickup_window_end > pickup_window_start',
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

  @ApiProperty({
    description:
      'Which side started it. A `RECIPIENT_CLAIM` skips the offer/accept exchange and opens already accepted.',
    enum: DonationOrigin,
    enumName: 'DonationOrigin',
    default: DonationOrigin.RETAILER_OFFER,
    example: DonationOrigin.RECIPIENT_CLAIM,
  })
  @Column({
    name: 'origin',
    type: 'enum',
    enum: DonationOrigin,
    enumName: DONATION_ORIGIN_ENUM_NAME,
    default: DonationOrigin.RETAILER_OFFER,
  })
  origin: DonationOrigin;

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
      'Start of the agreed collection window. Proposed by the retailer, confirmed on accept.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'pickup_window_start', type: 'timestamptz', nullable: true })
  pickupWindowStart: Date | null;

  @ApiPropertyOptional({
    description:
      'End of the agreed collection window. Both apps show a range rather than an instant.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'pickup_window_end', type: 'timestamptz', nullable: true })
  pickupWindowEnd: Date | null;

  @ApiPropertyOptional({
    description:
      'The named branch slot the window was reserved against, when the recipient picked one rather than the retailer proposing a time.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'pickup_slot_id', type: 'uuid', nullable: true })
  pickupSlotId: string | null;

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

  @ApiPropertyOptional({
    description:
      'Cancellation reason as a fixed code, so the apps can offer a picker and the platform can report on causes.',
    enum: CancellationReasonCode,
    enumName: 'CancellationReasonCode',
    nullable: true,
    example: CancellationReasonCode.VEHICLE_BREAKDOWN,
  })
  @Column({
    name: 'cancellation_reason_code',
    type: 'enum',
    enum: CancellationReasonCode,
    enumName: CANCELLATION_REASON_CODE_ENUM_NAME,
    nullable: true,
  })
  cancellationReasonCode: CancellationReasonCode | null;

  @ApiPropertyOptional({
    description:
      'User who cancelled. Either side can, and the apps say which one did.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'cancelled_by_user_id', type: 'uuid', nullable: true })
  cancelledByUserId: string | null;

  // --- Totals, recomputed from the lines until DELIVERED ---

  @ApiProperty({ description: 'Number of lines.', type: Number, default: 0 })
  @Column({ name: 'line_count', type: 'smallint', default: 0 })
  lineCount: number;

  @ApiProperty({
    description:
      'Total units across every line. Kept beside the weight because both apps count items, not only kilos.',
    type: Number,
    default: 0,
    example: 42,
  })
  @Column({
    name: 'total_quantity',
    type: 'numeric',
    precision: 12,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  totalQuantity: number;

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
    default: 'EUR',
    example: 'EUR',
  })
  @Column({ name: 'currency', type: 'char', length: 3, default: 'EUR' })
  currency: string;

  // --- Impact, frozen on delivery ---

  @ApiPropertyOptional({
    description:
      'Meals this donation represents. Written at delivery from the factor in force then, so a later factor change cannot restate a certificate.',
    type: Number,
    nullable: true,
    example: 45.75,
  })
  @Column({
    name: 'estimated_meals',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  estimatedMeals: number | null;

  @ApiPropertyOptional({
    description: 'CO₂-equivalent emissions avoided, in kilograms.',
    type: Number,
    nullable: true,
    example: 36.6,
  })
  @Column({
    name: 'co2_avoided_kg',
    type: 'numeric',
    precision: 12,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  co2AvoidedKg: number | null;

  @ApiPropertyOptional({
    description: 'The factor row the two figures above were computed from.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'impact_factor_id', type: 'uuid', nullable: true })
  impactFactorId: string | null;

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
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancelled_by_user_id' })
  cancelledByUser?: Relation<User> | null;

  @ApiHideProperty()
  @ManyToOne(() => LocationPickupSlot, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pickup_slot_id' })
  pickupSlot?: Relation<LocationPickupSlot> | null;

  @ApiHideProperty()
  @ManyToOne(() => ImpactFactor, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'impact_factor_id' })
  impactFactor?: Relation<ImpactFactor> | null;

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
