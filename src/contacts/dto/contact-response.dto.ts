import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Contact } from '../entities/contact.entity.js';
import { ContactType } from '../enums/contact-type.enum.js';

/** API representation of a contact. */
export class ContactResponseDto {
  @ApiProperty({ description: 'Unique contact ID.', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({
    description: 'Owning retailer. Exactly one owner is set.',
    format: 'uuid',
    nullable: true,
  })
  retailerId: string | null;

  @ApiPropertyOptional({
    description: 'Owning recipient. Exactly one owner is set.',
    format: 'uuid',
    nullable: true,
  })
  recipientId: string | null;

  @ApiProperty({
    description: 'Full name of the person.',
    example: 'María González',
  })
  fullName: string;

  @ApiPropertyOptional({ description: 'Email address.', nullable: true })
  email: string | null;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format.',
    nullable: true,
  })
  phone: string | null;

  @ApiPropertyOptional({
    description: 'Alternate phone number in E.164 format.',
    nullable: true,
  })
  secondaryPhone: string | null;

  @ApiPropertyOptional({
    description: 'Role inside the organization.',
    nullable: true,
  })
  jobTitle: string | null;

  @ApiProperty({
    description: 'Which function this contact covers.',
    enum: ContactType,
    enumName: 'ContactType',
    example: ContactType.OPERATIONS,
  })
  type: ContactType;

  @ApiProperty({ description: 'Whether this is the main contact.' })
  isPrimary: boolean;

  @ApiPropertyOptional({ description: 'Internal notes.', nullable: true })
  notes: string | null;

  @ApiPropertyOptional({
    description: 'Login this person owns, when they have one.',
    format: 'uuid',
    nullable: true,
  })
  userId: string | null;

  @ApiPropertyOptional({
    description:
      'Branch this person works at. Null for an organization-wide contact.',
    format: 'uuid',
    nullable: true,
  })
  locationId: string | null;

  @ApiProperty({
    description: 'When the contact was created (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the contact was last modified (ISO 8601).',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Maps a Contact entity onto its API representation.
   * @param data The Contact entity loaded from the database.
   */
  constructor(data: Contact) {
    this.id = data.id;
    this.retailerId = data.retailerId;
    this.recipientId = data.recipientId;
    this.fullName = data.fullName;
    this.email = data.email;
    this.phone = data.phone;
    this.secondaryPhone = data.secondaryPhone;
    this.jobTitle = data.jobTitle;
    this.type = data.type;
    this.isPrimary = data.isPrimary;
    this.notes = data.notes;
    this.userId = data.userId;
    this.locationId = data.locationId;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}
