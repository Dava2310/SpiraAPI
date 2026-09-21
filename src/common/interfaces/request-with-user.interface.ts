import type { Request } from 'express';

import type { UserRole } from '../../users/enums/user-role.enum.js';

/** The caller AuthGuard resolved from a verified access token. */
export interface AuthenticatedUser {
  /** The authenticated user's ID. */
  id: string;

  /** The presented token's `jti`, which logout and change-password revoke. */
  jti: string;

  /** When the presented token expires, copied into the denylist row on revocation. */
  expiresAt: Date;

  /** What the caller is allowed to do, checked by RolesGuard. */
  role: UserRole;

  /** The retailer this caller belongs to, when they are a RETAILER. */
  retailerId: string | null;

  /** The recipient this caller belongs to, when they are a RECIPIENT. */
  recipientId: string | null;
}

/** An Express request that has passed AuthGuard. */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
