/**
 * One recurring availability slot on a location, stored in its `pickupWindows`.
 * Times are local to the location's `timezone`, not UTC.
 */
export interface PickupWindow {
  /** ISO-8601 weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;

  /** Local start time, `HH:mm` (24h). */
  startTime: string;

  /** Local end time, `HH:mm` (24h). */
  endTime: string;

  /** Optional free-text qualifier, e.g. "after closing". */
  note?: string;
}
