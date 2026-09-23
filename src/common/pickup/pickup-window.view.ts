/**
 * Formats a collection window for display.
 *
 * Shared because both sides show the same window and must agree on it: the NGO
 * reads it to decide when to drive, the retailer reads it to know when to have the
 * crates by the door. It is always rendered in the timezone of the branch or the
 * organization reading it, never the server's, because a window is a local opening
 * time rather than an instant.
 * @param start When collection opens, or null when no window is set.
 * @param end When collection closes, or null for an open-ended window.
 * @param timezone The IANA zone to render in.
 * @returns A label such as `Today, 18:00 - 20:00`, or null without a window.
 */
export function pickupWindowLabel(
  start: Date | null | undefined,
  end: Date | null | undefined,
  timezone: string,
): string | null {
  if (!start) {
    return null;
  }

  const time = (value: Date): string =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value);

  const dayKey = (value: Date): string =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);

  const day =
    dayKey(start) === dayKey(new Date())
      ? 'Today'
      : new Intl.DateTimeFormat('en-GB', {
          timeZone: timezone,
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).format(start);

  const range = end ? `${time(start)} - ${time(end)}` : time(start);

  return `${day}, ${range}`;
}
