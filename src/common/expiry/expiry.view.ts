import { ExpiryKind } from '../enums/expiry-kind.enum.js';
import {
  CRITICAL_HOURS_THRESHOLD,
  EXPIRING_HOURS_THRESHOLD,
  SurplusUrgency,
} from '../enums/surplus-urgency.enum.js';

const MS_PER_HOUR = 60 * 60 * 1000;
const HOURS_PER_DAY = 24;

/** Expiry figures derived per request, never stored. */
export interface ExpiryView {
  hoursRemaining: number | null;
  daysRemaining: number | null;
  urgency: SurplusUrgency | null;
}

/**
 * Derives the hours left, whole days left and urgency band for an expiry.
 *
 * Every one of these is computed per request: both frontends stored them and
 * both drifted out of date, which is what makes expiry a time rather than a
 * calendar date in the first place.
 * @param expiresAt The stored expiry instant, or null for a non-perishable.
 * @returns The three figures, all null when there is no expiry.
 */
export function expiryView(expiresAt: Date | null | undefined): ExpiryView {
  if (!expiresAt) {
    return { hoursRemaining: null, daysRemaining: null, urgency: null };
  }

  const hoursRemaining =
    Math.round(((expiresAt.getTime() - Date.now()) / MS_PER_HOUR) * 10) / 10;

  return {
    hoursRemaining,
    daysRemaining: Math.floor(hoursRemaining / HOURS_PER_DAY),
    urgency: urgencyOf(hoursRemaining),
  };
}

/**
 * Buckets hours remaining into the urgency band both apps colour-code on.
 * @param hoursRemaining Hours until expiry, or null.
 * @returns The urgency band, or null without an expiry.
 */
export function urgencyOf(
  hoursRemaining: number | null,
): SurplusUrgency | null {
  if (hoursRemaining === null) {
    return null;
  }

  if (hoursRemaining < CRITICAL_HOURS_THRESHOLD) {
    return SurplusUrgency.CRITICAL;
  }

  if (hoursRemaining < EXPIRING_HOURS_THRESHOLD) {
    return SurplusUrgency.EXPIRING;
  }

  return SurplusUrgency.STANDARD;
}

/**
 * Whether a lot is past a *use by* date and therefore may not be donated.
 *
 * Only a use-by date closes a lot. Past its best-before a lot is still good to give
 * away, which is most of what surplus recovery is for, so the two must not share a
 * rule. Derived per request like everything else here: a stored flag would be true
 * or false depending on when it was last written.
 * @param lot The lot's expiry and which kind of date it is.
 * @returns True when the lot must no longer be offered or collected.
 */
export function isPastUseBy(lot: {
  expiresAt: Date | null | undefined;
  expiryKind: ExpiryKind | null | undefined;
}): boolean {
  if (!lot.expiresAt || lot.expiryKind !== ExpiryKind.USE_BY) {
    return false;
  }

  return lot.expiresAt.getTime() <= Date.now();
}
