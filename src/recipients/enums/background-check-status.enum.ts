/** Outcome of the recipient's background check. */
export enum BackgroundCheckStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

export const BACKGROUND_CHECK_STATUS_ENUM_NAME =
  'recipient_background_check_status';
