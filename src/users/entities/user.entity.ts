import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';

import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity.js';
import { InvalidToken } from '../../invalid-tokens/entities/invalid-token.entity.js';
import { Recipient } from '../../recipients/entities/recipient.entity.js';
import { Retailer } from '../../retailers/entities/retailer.entity.js';
import { USER_ROLE_ENUM_NAME, UserRole } from '../enums/user-role.enum.js';

/** Login credentials. Identity only — names and phone numbers live in `contact`. */
@Entity('user')
@Check(
  'chk_user_role_profile',
  `(role = 'RETAILER'  AND retailer_id  IS NOT NULL AND recipient_id IS NULL)
   OR (role = 'RECIPIENT' AND recipient_id IS NOT NULL AND retailer_id  IS NULL)
   OR (role = 'ADMIN'     AND retailer_id  IS NULL     AND recipient_id IS NULL)`,
)
@Index('uq_user_email', ['email'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_user_retailer', ['retailerId'])
@Index('idx_user_recipient', ['recipientId'])
export class User extends SoftDeletableEntity {
  // --- Credentials ---

  @ApiProperty({
    description: 'Login identifier. Case-insensitive and unique.',
    format: 'email',
    example: 'maria.gonzalez@real.com.py',
  })
  @Column({ name: 'email', type: 'citext' })
  email: string;

  @ApiHideProperty()
  @Exclude()
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @ApiProperty({
    description: 'Authorization role. Determines which profile is linked.',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.RETAILER,
  })
  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    enumName: USER_ROLE_ENUM_NAME,
  })
  role: UserRole;

  // --- Profile link — set according to `role` ---

  @ApiPropertyOptional({
    description:
      'Linked retailer. Set when `role` is `RETAILER`, otherwise `null`.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'retailer_id', type: 'uuid', nullable: true })
  retailerId: string | null;

  @ApiPropertyOptional({
    description:
      'Linked recipient. Set when `role` is `RECIPIENT`, otherwise `null`.',
    format: 'uuid',
    nullable: true,
  })
  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  recipientId: string | null;

  // --- Account state ---

  @ApiProperty({
    description:
      'Set to `false` to block login without deleting the account. Distinct from soft delete.',
    default: true,
    example: true,
  })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'When the email was confirmed. `null` means still unverified.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Last successful login.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => Retailer, (retailer) => retailer.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'retailer_id' })
  retailer?: Relation<Retailer> | null;

  @ApiHideProperty()
  @ManyToOne(() => Recipient, (recipient) => recipient.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Relation<Recipient> | null;

  @ApiHideProperty()
  @OneToMany(() => InvalidToken, (invalidToken) => invalidToken.user)
  invalidTokens?: Relation<InvalidToken>[];
}
