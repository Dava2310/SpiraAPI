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
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { Recipient } from '../../recipients/entities/recipient.entity.js';
import { Retailer } from '../../retailers/entities/retailer.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  CONTACT_TYPE_ENUM_NAME,
  ContactType,
} from '../enums/contact-type.enum.js';

/** A person to reach at a retailer or a recipient. Many per owner. */
@Entity('contact')
@Check('chk_contact_owner', 'num_nonnulls(retailer_id, recipient_id) = 1')
@Index('idx_contact_retailer', ['retailerId'])
@Index('idx_contact_recipient', ['recipientId'])
@Index('idx_contact_location', ['locationId'], {
  where: 'deleted_at IS NULL AND location_id IS NOT NULL',
})
@Index('uq_contact_primary_retailer', ['retailerId'], {
  unique: true,
  where: 'is_primary AND retailer_id IS NOT NULL AND deleted_at IS NULL',
})
@Index('uq_contact_primary_recipient', ['recipientId'], {
  unique: true,
  where: 'is_primary AND recipient_id IS NOT NULL AND deleted_at IS NULL',
})
@Index('uq_contact_user', ['userId'], {
  unique: true,
  where: 'deleted_at IS NULL AND user_id IS NOT NULL',
})
export class Contact extends SoftDeletableEntity {
  // --- Owner — exactly one of the two is set ---

  @ApiPropertyOptional({
    description:
      'Owning retailer. Exactly one of `retailerId` / `recipientId` is set.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'retailer_id', type: 'uuid', nullable: true })
  retailerId: string | null;

  @ApiPropertyOptional({
    description:
      'Owning recipient. Exactly one of `retailerId` / `recipientId` is set.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  recipientId: string | null;

  // --- The person ---

  @ApiProperty({
    description: 'Full name of the person.',
    maxLength: 150,
    example: 'María González',
  })
  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @ApiPropertyOptional({
    description: 'Email address. Case-insensitive.',
    format: 'email',
    nullable: true,
    example: 'maria.gonzalez@real.com.py',
  })
  @Column({ name: 'email', type: 'citext', nullable: true })
  email: string | null;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format.',
    maxLength: 30,
    nullable: true,
    example: '+595981123456',
  })
  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @ApiPropertyOptional({
    description: 'Alternate phone number in E.164 format.',
    maxLength: 30,
    nullable: true,
    example: '+595981654321',
  })
  @Column({
    name: 'secondary_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  secondaryPhone: string | null;

  @ApiPropertyOptional({
    description: 'Role inside the organization, as they describe it.',
    maxLength: 100,
    nullable: true,
    example: 'Head of Operations',
  })
  @Column({ name: 'job_title', type: 'varchar', length: 100, nullable: true })
  jobTitle: string | null;

  @ApiProperty({
    description: 'Which function this contact covers.',
    enum: ContactType,
    enumName: 'ContactType',
    example: ContactType.OPERATIONS,
  })
  @Column({
    name: 'type',
    type: 'enum',
    enum: ContactType,
    enumName: CONTACT_TYPE_ENUM_NAME,
  })
  type: ContactType;

  @ApiProperty({
    description: 'Marks the main contact for the owner. At most one per owner.',
    default: false,
    example: true,
  })
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @ApiPropertyOptional({
    description: 'Internal notes about reaching this person.',
    nullable: true,
    example: 'Prefers WhatsApp. Unavailable Mondays.',
  })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ApiPropertyOptional({
    description:
      'Login this person owns, when they have one. `user` holds credentials only, so a contact is what gives a logged-in driver a name for the donation certificate.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ApiPropertyOptional({
    description:
      'Branch this person is attached to, for a site-level contact such as a store manager. Null for an organization-wide contact.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Retailer, (retailer) => retailer.contacts, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'retailer_id' })
  retailer?: Relation<Retailer> | null;

  @ApiHideProperty()
  @ManyToOne(() => Recipient, (recipient) => recipient.contacts, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Relation<Recipient> | null;

  @ApiHideProperty()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User> | null;

  @ApiHideProperty()
  @ManyToOne(() => Location, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location?: Relation<Location> | null;
}
