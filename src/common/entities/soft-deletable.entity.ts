import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeleteDateColumn } from 'typeorm';

import { AuditedEntity } from './audited.entity.js';

/** {@link AuditedEntity} plus a `deleted_at` soft-delete marker. */
export abstract class SoftDeletableEntity extends AuditedEntity {
  @ApiPropertyOptional({
    description:
      'Soft-delete marker. `null` means the row is active; a timestamp means it was deleted at that moment.',
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
