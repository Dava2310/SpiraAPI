import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PartnershipStatus } from '../../partnerships/enums/partnership-status.enum.js';
import { RecipientType } from '../../recipients/enums/recipient-type.enum.js';

/**
 * A recipient this branch may actually donate to.
 *
 * The retailer app listed every NGO on the platform unconditionally; a partner
 * list that ignores the partnership is how a manager picks someone who cannot
 * receive from them.
 */
export class PartnerResponseDto {
  @ApiProperty({ description: 'The partnership row.', format: 'uuid' })
  partnershipId: string;

  @ApiProperty({ description: 'The recipient.', format: 'uuid' })
  recipientId: string;

  @ApiProperty({ description: 'Public name.', example: 'Banc dels Aliments' })
  displayName: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Abbreviated name, for tight layouts.',
    nullable: true,
  })
  shortName: string | null;

  @ApiProperty({
    description: 'What kind of receiver they are.',
    enum: RecipientType,
    enumName: 'RecipientType',
  })
  type: RecipientType;

  @ApiPropertyOptional({
    type: String,
    description: 'Logo URL.',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiProperty({ description: 'Whether an admin has verified them.' })
  isVerified: boolean;

  @ApiProperty({
    description: 'State of the partnership.',
    enum: PartnershipStatus,
    enumName: 'PartnershipStatus',
  })
  partnershipStatus: PartnershipStatus;

  @ApiProperty({ description: 'Whether this partner is preferred.' })
  isPreferred: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Named contact on their side.',
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
    description: 'Plate of their usual vehicle.',
    nullable: true,
  })
  vehiclePlate: string | null;

  @ApiProperty({
    description: 'Donations delivered to them from this branch.',
    type: Number,
  })
  deliveredCount: number;

  constructor(init: PartnerResponseDto) {
    this.partnershipId = init.partnershipId;
    this.recipientId = init.recipientId;
    this.displayName = init.displayName;
    this.shortName = init.shortName;
    this.type = init.type;
    this.logoUrl = init.logoUrl;
    this.isVerified = init.isVerified;
    this.partnershipStatus = init.partnershipStatus;
    this.isPreferred = init.isPreferred;
    this.contactPerson = init.contactPerson;
    this.phone = init.phone;
    this.vehiclePlate = init.vehiclePlate;
    this.deliveredCount = init.deliveredCount;
  }
}
