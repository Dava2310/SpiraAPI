/** Why a product is donatable rather than sellable. */
export enum DonationReason {
  NEAR_EXPIRY = 'NEAR_EXPIRY',
  DAMAGED_PACKAGING = 'DAMAGED_PACKAGING',
  SURPLUS_STOCK = 'SURPLUS_STOCK',
  AESTHETIC_IMPERFECTION = 'AESTHETIC_IMPERFECTION',
}

export const DONATION_REASON_ENUM_NAME = 'donation_reason';
