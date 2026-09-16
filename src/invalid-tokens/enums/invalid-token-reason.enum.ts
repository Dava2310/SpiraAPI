/** Why a token was added to the denylist. */
export enum InvalidTokenReason {
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ADMIN_REVOKE = 'ADMIN_REVOKE',
  SECURITY = 'SECURITY',
}

export const INVALID_TOKEN_REASON_ENUM_NAME = 'invalid_token_reason';
