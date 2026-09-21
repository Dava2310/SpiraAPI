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
  OneToOne,
  type Relation,
} from 'typeorm';

import { AuditedEntity } from '../../common/entities/audited.entity.js';
import { numericTransformer } from '../../common/transformers/numeric.transformer.js';
import { Donation } from '../../donations/entities/donation.entity.js';
import { ImpactFactor } from '../../impact-factors/entities/impact-factor.entity.js';

/**
 * The tax and compliance certificate issued when a donation completes.
 *
 * Every party name and total is snapshotted, because this document must be
 * reproducible years later: reading them through the live `donation` would let
 * a branch rename rewrite history.
 *
 * There is no soft delete here, on the same reasoning as `invalid_token`: a tax
 * certificate that a query can silently filter out is worse than one that
 * cannot be removed. Void it with a status if a correction is ever needed.
 */
@Entity('donation_receipt')
@Index('uq_receipt_number', ['receiptNumber'], { unique: true })
export class DonationReceipt extends AuditedEntity {
  @ApiProperty({ description: 'Donation certified.', format: 'uuid' })
  @Column({ name: 'donation_id', type: 'uuid' })
  donationId: string;

  @ApiProperty({
    description: 'Certificate number, unique and sequential per year.',
    maxLength: 30,
    example: 'FR-REC-2026-000291',
  })
  @Column({ name: 'receipt_number', type: 'varchar', length: 30 })
  receiptNumber: string;

  @ApiProperty({
    description: 'When the certificate was issued.',
    type: String,
    format: 'date-time',
  })
  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date;

  // --- Donating party, frozen at issue ---

  @ApiProperty({ description: 'Donor legal name.', maxLength: 200 })
  @Column({ name: 'retailer_legal_name', type: 'varchar', length: 200 })
  retailerLegalName: string;

  @ApiPropertyOptional({
    description: 'Donor tax identifier, required on a tax document.',
    maxLength: 40,
    nullable: true,
  })
  @Column({
    name: 'retailer_tax_id',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  retailerTaxId: string | null;

  @ApiProperty({ description: 'Branch name.', maxLength: 150 })
  @Column({ name: 'location_label', type: 'varchar', length: 150 })
  locationLabel: string;

  @ApiPropertyOptional({
    description: 'Branch code.',
    maxLength: 40,
    nullable: true,
  })
  @Column({
    name: 'location_code',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  locationCode: string | null;

  @ApiProperty({ description: 'Branch address, rendered flat.' })
  @Column({ name: 'location_address', type: 'text' })
  locationAddress: string;

  @ApiProperty({
    description: 'Name of the retailer-side user who authorised the handover.',
    maxLength: 150,
  })
  @Column({ name: 'authorized_by_name', type: 'varchar', length: 150 })
  authorizedByName: string;

  // --- Receiving party, frozen at issue ---

  @ApiProperty({ description: 'Recipient legal name.', maxLength: 200 })
  @Column({ name: 'recipient_legal_name', type: 'varchar', length: 200 })
  recipientLegalName: string;

  @ApiPropertyOptional({
    description: 'Recipient tax identifier.',
    maxLength: 40,
    nullable: true,
  })
  @Column({
    name: 'recipient_tax_id',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  recipientTaxId: string | null;

  @ApiPropertyOptional({
    description: 'Name of the person who collected.',
    maxLength: 150,
    nullable: true,
  })
  @Column({ name: 'driver_name', type: 'varchar', length: 150, nullable: true })
  driverName: string | null;

  @ApiPropertyOptional({
    description:
      'Plate of the collecting vehicle, the de-facto identity check at handover.',
    maxLength: 20,
    nullable: true,
  })
  @Column({
    name: 'vehicle_plate',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  vehiclePlate: string | null;

  @ApiPropertyOptional({
    description:
      'Who signed for the goods on the receiving side, as a free-text name. The driver need not be a platform user.',
    maxLength: 150,
    nullable: true,
    example: 'Marta Ruiz',
  })
  @Column({
    name: 'received_by_label',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  receivedByLabel: string | null;

  // --- Totals, frozen at issue ---

  @ApiProperty({ description: 'Number of lines certified.', type: Number })
  @Column({ name: 'line_count', type: 'smallint' })
  lineCount: number;

  @ApiProperty({ description: 'Total weight certified.', type: Number })
  @Column({
    name: 'total_weight_kg',
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: numericTransformer,
  })
  totalWeightKg: number;

  @ApiProperty({ description: 'Total units certified.', type: Number })
  @Column({
    name: 'total_quantity',
    type: 'numeric',
    precision: 12,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  totalQuantity: number;

  @ApiPropertyOptional({
    description: 'Total retail value certified.',
    type: Number,
    nullable: true,
  })
  @Column({
    name: 'total_retail_value',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  totalRetailValue: number | null;

  @ApiProperty({
    description: 'Currency of the totals, as an ISO 4217 code.',
    minLength: 3,
    maxLength: 3,
    example: 'EUR',
  })
  @Column({ name: 'currency', type: 'char', length: 3, default: 'EUR' })
  currency: string;

  @ApiPropertyOptional({
    description:
      'Meals the donation is reckoned to provide, frozen so a later factor change cannot alter what this certificate stated.',
    type: Number,
    nullable: true,
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
    description: 'Emissions avoided, frozen at issue.',
    type: Number,
    nullable: true,
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
    description: 'Which conversion factors produced the impact figures.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'impact_factor_id', type: 'uuid', nullable: true })
  impactFactorId: string | null;

  @ApiPropertyOptional({
    description:
      'Statute the certificate is issued under. Jurisdiction-dependent, so data rather than a template literal.',
    maxLength: 200,
    nullable: true,
    example: 'Food Recovery & Good Samaritan Acts',
  })
  @Column({
    name: 'legal_reference',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  legalReference: string | null;

  @ApiPropertyOptional({
    description: 'The consumed pickup token, retained as evidence of handover.',
    maxLength: 60,
    nullable: true,
  })
  @Column({
    name: 'verification_code',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  verificationCode: string | null;

  // --- Relations ---

  /** `RESTRICT`: a certificate must never lose the donation it certifies. */
  @ApiHideProperty()
  @OneToOne(() => Donation, (donation) => donation.receipt, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'donation_id' })
  donation?: Relation<Donation>;

  @ApiHideProperty()
  @ManyToOne(() => ImpactFactor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'impact_factor_id' })
  impactFactor?: Relation<ImpactFactor> | null;
}
