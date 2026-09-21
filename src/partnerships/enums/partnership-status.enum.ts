/** State of the working relationship between a retailer and a recipient. */
export enum PartnershipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

export const PARTNERSHIP_STATUS_ENUM_NAME = 'partnership_status';
