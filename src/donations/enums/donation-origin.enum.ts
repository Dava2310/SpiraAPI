/** Which side brought the donation into being. */
export enum DonationOrigin {
  /** The retailer staged stock and offered it to a recipient. */
  RETAILER_OFFER = 'RETAILER_OFFER',
  /** The recipient claimed listed stock off the open shelf. */
  RECIPIENT_CLAIM = 'RECIPIENT_CLAIM',
}

export const DONATION_ORIGIN_ENUM_NAME = 'donation_origin';
