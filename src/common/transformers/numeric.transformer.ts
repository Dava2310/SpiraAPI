import type { ValueTransformer } from 'typeorm';

/** Hydrates a `numeric` column, which `pg` returns as a string, into a `number`. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null): number | null => value ?? null,
  from: (value?: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
