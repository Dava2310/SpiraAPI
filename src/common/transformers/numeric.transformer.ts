import type { ValueTransformer } from 'typeorm';

/** Hydrates a `numeric` column, which `pg` returns as a string, into a `number`. */
export const numericTransformer: ValueTransformer = {
  // Passed through untouched: coercing `undefined` to `null` here would override
  // the column's own DEFAULT and write a null into a NOT NULL column.
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
