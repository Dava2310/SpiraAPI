/**
 * One day's public opening hours for a location, stored in `openingHours`.
 * Times are local to the location's `timezone`, not UTC.
 */
export interface OpeningHours {
  /** ISO-8601 weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;

  /** Local opening time, `HH:mm` (24h). */
  opensAt: string;

  /** Local closing time, `HH:mm` (24h). */
  closesAt: string;
}
