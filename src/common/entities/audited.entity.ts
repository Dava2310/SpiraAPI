import { ApiProperty } from '@nestjs/swagger';
import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base class for every table: UUID primary key, `created_at`, `updated_at`.
 *
 * Soft delete lives on {@link SoftDeletableEntity}, which `invalid_token` must
 * not use.
 */
export abstract class AuditedEntity {
  @ApiProperty({
    description: 'Primary key.',
    format: 'uuid',
    example: '3f2c1b8e-9a4d-4c7f-8b1e-2d6a5c9f0e11',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'When the row was inserted. Never updated afterwards.',
    type: String,
    format: 'date-time',
    example: '2026-09-16T14:32:05.123Z',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({
    description: 'Touched on every write.',
    type: String,
    format: 'date-time',
    example: '2026-09-16T14:32:05.123Z',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
