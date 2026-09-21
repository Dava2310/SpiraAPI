/**
 * Lifecycle of a donation, which both sides move:
 *
 * ```
 * DRAFT → OFFERED → ACCEPTED → READY_FOR_PICKUP → DRIVER_EN_ROUTE → DELIVERED
 *           └→ DECLINED → (re-offer)                  └→ CANCELLED
 * ```
 *
 * The retailer owns every transition except `ACCEPTED`, `DECLINED` and
 * `DRIVER_EN_ROUTE`, which belong to the recipient.
 */
export enum DonationStatus {
  DRAFT = 'DRAFT',
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DRIVER_EN_ROUTE = 'DRIVER_EN_ROUTE',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export const DONATION_STATUS_ENUM_NAME = 'donation_status';
