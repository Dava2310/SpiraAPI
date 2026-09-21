/**
 * How close a stock lot is to its expiry, derived from `expiresAt` at read time
 * and never stored. Thresholds are application constants, overridable per query.
 */
export enum SurplusUrgency {
  /** Under 12 hours left. */
  CRITICAL = 'CRITICAL',
  /** Under 24 hours left. */
  EXPIRING = 'EXPIRING',
  STANDARD = 'STANDARD',
}

/** Hours-left boundary below which a lot counts as {@link SurplusUrgency.CRITICAL}. */
export const CRITICAL_HOURS_THRESHOLD = 12;

/** Hours-left boundary below which a lot counts as {@link SurplusUrgency.EXPIRING}. */
export const EXPIRING_HOURS_THRESHOLD = 24;
