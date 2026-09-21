import { BadRequestException } from '@nestjs/common';

/** A half-open date range, with the label a report should print. */
export interface ResolvedPeriod {
  period: string;
  periodLabel: string;
  from: Date;
  to: Date;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Turns a `YYYY` or `YYYY-MM` period into a half-open UTC range.
 *
 * Defaults to the current year rather than all time: an unbounded total
 * labelled as a period is the discrepancy both frontends shipped.
 * @param period The requested period, or undefined for the current year.
 * @returns The range and the label to print over it.
 * @throws BadRequestException If the period is not `YYYY` or `YYYY-MM`.
 */
export function resolvePeriod(period?: string): ResolvedPeriod {
  const requested = period ?? String(new Date().getUTCFullYear());

  const yearMatch = /^(\d{4})$/.exec(requested);

  if (yearMatch) {
    const year = Number(yearMatch[1]);

    return {
      period: requested,
      periodLabel: `${year} Annual Report`,
      from: new Date(Date.UTC(year, 0, 1)),
      to: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(requested);

  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);

    return {
      period: requested,
      periodLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      from: new Date(Date.UTC(year, month - 1, 1)),
      to: new Date(Date.UTC(year, month, 1)),
    };
  }

  throw new BadRequestException(
    `The period must be a year (2026) or a month (2026-09), but was: ${requested}`,
  );
}
