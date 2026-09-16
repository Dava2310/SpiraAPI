/** Lifecycle of a platform profile (`retailer` / `recipient`). */
export enum ProfileStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export const PROFILE_STATUS_ENUM_NAME = 'profile_status';
