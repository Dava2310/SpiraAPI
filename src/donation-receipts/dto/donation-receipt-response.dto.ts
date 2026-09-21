import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { DonationReceipt } from '../entities/donation-receipt.entity.js';

/**
 * API representation of a donation certificate.
 *
 * Every field is read back from the snapshot taken at issue, never recomputed,
 * so reprinting an old certificate reproduces it exactly.
 */
export class DonationReceiptResponseDto {
  @ApiProperty({ description: 'Unique certificate ID.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Donation certified.', format: 'uuid' })
  donationId: string;

  @ApiProperty({
    description: 'Certificate number.',
    example: 'FR-REC-2026-000291',
  })
  receiptNumber: string;

  @ApiProperty({
    description: 'When the certificate was issued (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  issuedAt: string;

  @ApiProperty({ description: 'Donor legal name.' })
  retailerLegalName: string;

  @ApiPropertyOptional({ description: 'Donor tax identifier.', nullable: true })
  retailerTaxId: string | null;

  @ApiProperty({ description: 'Branch name.' })
  locationLabel: string;

  @ApiPropertyOptional({ description: 'Branch code.', nullable: true })
  locationCode: string | null;

  @ApiProperty({ description: 'Branch address.' })
  locationAddress: string;

  @ApiProperty({ description: 'Who authorised the handover.' })
  authorizedByName: string;

  @ApiProperty({ description: 'Recipient legal name.' })
  recipientLegalName: string;

  @ApiPropertyOptional({
    description: 'Recipient tax identifier.',
    nullable: true,
  })
  recipientTaxId: string | null;

  @ApiPropertyOptional({ description: 'Who collected.', nullable: true })
  driverName: string | null;

  @ApiPropertyOptional({
    description: 'Plate of the collecting vehicle.',
    nullable: true,
  })
  vehiclePlate: string | null;

  @ApiProperty({ description: 'Number of lines certified.', type: Number })
  lineCount: number;

  @ApiProperty({ description: 'Total weight certified.', type: Number })
  totalWeightKg: number;

  @ApiPropertyOptional({
    description: 'Total retail value certified.',
    type: Number,
    nullable: true,
  })
  totalRetailValue: number | null;

  @ApiProperty({ description: 'Currency of the totals.', example: 'USD' })
  currency: string;

  @ApiPropertyOptional({
    description: 'Meals the donation is reckoned to provide.',
    type: Number,
    nullable: true,
  })
  estimatedMeals: number | null;

  @ApiPropertyOptional({
    description: 'Emissions avoided.',
    type: Number,
    nullable: true,
  })
  co2AvoidedKg: number | null;

  @ApiPropertyOptional({
    description: 'Which conversion factors produced the impact figures.',
    format: 'uuid',
    nullable: true,
  })
  impactFactorId: string | null;

  @ApiPropertyOptional({
    description: 'Statute the certificate is issued under.',
    nullable: true,
  })
  legalReference: string | null;

  @ApiPropertyOptional({
    description: 'The consumed pickup token, retained as evidence of handover.',
    nullable: true,
  })
  verificationCode: string | null;

  @ApiProperty({
    description: 'When the record was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  /**
   * Maps a DonationReceipt entity onto its API representation.
   * @param data The DonationReceipt entity loaded from the database.
   */
  constructor(data: DonationReceipt) {
    this.id = data.id;
    this.donationId = data.donationId;
    this.receiptNumber = data.receiptNumber;
    this.issuedAt = data.issuedAt.toISOString();
    this.retailerLegalName = data.retailerLegalName;
    this.retailerTaxId = data.retailerTaxId;
    this.locationLabel = data.locationLabel;
    this.locationCode = data.locationCode;
    this.locationAddress = data.locationAddress;
    this.authorizedByName = data.authorizedByName;
    this.recipientLegalName = data.recipientLegalName;
    this.recipientTaxId = data.recipientTaxId;
    this.driverName = data.driverName;
    this.vehiclePlate = data.vehiclePlate;
    this.lineCount = data.lineCount;
    this.totalWeightKg = data.totalWeightKg;
    this.totalRetailValue = data.totalRetailValue;
    this.currency = data.currency;
    this.estimatedMeals = data.estimatedMeals;
    this.co2AvoidedKg = data.co2AvoidedKg;
    this.impactFactorId = data.impactFactorId;
    this.legalReference = data.legalReference;
    this.verificationCode = data.verificationCode;
    this.createdAt = data.createdAt.toISOString();
  }
}
