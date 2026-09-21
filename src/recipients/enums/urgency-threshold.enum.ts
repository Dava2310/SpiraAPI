/** How urgent a listing must be before the recipient is alerted about it. */
export enum UrgencyThreshold {
  ALL = 'ALL',
  CRITICAL_EXPIRING = 'CRITICAL_EXPIRING',
  CRITICAL_ONLY = 'CRITICAL_ONLY',
}

export const URGENCY_THRESHOLD_ENUM_NAME = 'urgency_threshold';
