import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
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
import {
  INVALID_TOKEN_REASON_ENUM_NAME,
  InvalidTokenReason,
} from '../enums/invalid-token-reason.enum.js';

/** JWT denylist: the `jti` claim of every token revoked before its natural expiry. */
@Entity('invalid_token')
@Index('uq_invalid_token_jti', ['jti'], { unique: true })
@Index('idx_invalid_token_user', ['userId'])
@Index('idx_invalid_token_expires', ['expiresAt'])
export class InvalidToken extends AuditedEntity {
  @ApiProperty({
    description: "The revoked token's `jti` claim.",
    format: 'uuid',
    example: '9b1d4f2a-6c3e-4a8b-9f10-7e5c2d4a8b16',
  })
  @Column({ name: 'jti', type: 'uuid' })
  jti: string;

  @ApiProperty({
    description: 'Owner of the revoked token.',
    format: 'uuid',
  })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty({
    description: 'When the token naturally expires (the JWT `exp`).',
    type: String,
    format: 'date-time',
    example: '2026-09-16T15:32:05.000Z',
  })
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @ApiProperty({
    description: 'Why the token was revoked.',
    enum: InvalidTokenReason,
    enumName: 'InvalidTokenReason',
    example: InvalidTokenReason.LOGOUT,
  })
  @Column({
    name: 'reason',
    type: 'enum',
    enum: InvalidTokenReason,
    enumName: INVALID_TOKEN_REASON_ENUM_NAME,
  })
  reason: InvalidTokenReason;

  // --- Relations ---

  @ApiHideProperty()
  @ManyToOne(() => User, (user) => user.invalidTokens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;
}
