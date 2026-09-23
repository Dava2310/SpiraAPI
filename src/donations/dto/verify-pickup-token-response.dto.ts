import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Who is at the counter, resolved from the credential they presented. */
export class VerifiedRecipientDto {
  @ApiProperty({ description: 'The recipient.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Public name.' })
  displayName: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Abbreviated name.',
    nullable: true,
  })
  shortName: string | null;

  @ApiProperty({ description: 'Whether an admin has verified them.' })
  isVerified: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Logo URL.',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Who is collecting, when recorded.',
    nullable: true,
  })
  contactPerson: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Their phone.',
    nullable: true,
  })
  phone: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Plate of the collecting vehicle.',
    nullable: true,
  })
  vehiclePlate: string | null;

  constructor(init: VerifiedRecipientDto) {
    Object.assign(this, init);
  }
}

/** What the retailer is about to hand over. */
export class VerifiedSummaryDto {
  @ApiProperty({ description: 'Lots in the donation.', type: Number })
  lineCount: number;

  @ApiProperty({ description: 'Units in the donation.', type: Number })
  totalQuantity: number;

  @ApiProperty({ description: 'Its weight.', type: Number })
  totalWeightKg: number;

  @ApiProperty({ description: 'Its retail value.', type: Number })
  totalRetailValue: number;

  @ApiProperty({ description: 'Currency of the value.', example: 'EUR' })
  currency: string;

  @ApiPropertyOptional({
    description: 'Meals it represents.',
    type: Number,
    nullable: true,
  })
  estimatedMeals: number | null;

  constructor(init: VerifiedSummaryDto) {
    Object.assign(this, init);
  }
}

/**
 * The scanner's verdict on a presented credential.
 *
 * Always resolves the code to a specific donation and organization. The demo
 * accepted any string of four or more characters and then read the NGO off the
 * first item in the basket, which would hand goods to whoever happened to scan.
 */
export class VerifyPickupTokenResponseDto {
  @ApiProperty({ description: 'Whether the credential may be accepted.' })
  valid: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Why it was rejected. Null when valid.',
    nullable: true,
    example: 'This pickup token has expired.',
  })
  message: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'The donation it releases. Null when invalid.',
    format: 'uuid',
    nullable: true,
  })
  donationId: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Reference shown to both parties. Null when invalid.',
    nullable: true,
  })
  code: string | null;

  @ApiPropertyOptional({
    description: 'Who is collecting. Null when invalid.',
    type: VerifiedRecipientDto,
    nullable: true,
  })
  recipient: VerifiedRecipientDto | null;

  @ApiPropertyOptional({
    description: 'What is being handed over. Null when invalid.',
    type: VerifiedSummaryDto,
    nullable: true,
  })
  summary: VerifiedSummaryDto | null;

  constructor(init: VerifyPickupTokenResponseDto) {
    Object.assign(this, init);
  }
}
