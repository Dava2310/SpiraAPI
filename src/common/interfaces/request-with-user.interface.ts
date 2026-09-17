import type { Request } from 'express';

/** The caller AuthGuard resolved from a verified access token. */
export interface AuthenticatedUser {
  /** The authenticated user's ID. */
  id: string;

  /** The presented token's `jti`, which logout and change-password revoke. */
  jti: string;

  /** When the presented token expires, copied into the denylist row on revocation. */
  expiresAt: Date;
}

/** An Express request that has passed AuthGuard. */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
