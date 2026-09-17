/** Claims carried by a Spira access token. `iat` and `exp` are added when signing. */
export interface JwtPayload {
  /** The authenticated user's ID. */
  sub: string;

  /** Unique token ID. Recorded in `invalid_token` when the token is revoked. */
  jti: string;

  iat?: number;
  exp?: number;
}
