import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../interfaces/request-with-user.interface.js';
import { UserRole } from '../../users/enums/user-role.enum.js';

/** Which organization a caller may act on, and on which side of a donation. */
export interface OrgScope {
  /** Set when the caller acts as a retailer. */
  retailerId: string | null;

  /** Set when the caller acts as a recipient. */
  recipientId: string | null;

  /** True for a platform operator, who is not bound to one organization. */
  isAdmin: boolean;
}

/**
 * Resolves the organization a caller is confined to.
 *
 * A RETAILER or RECIPIENT whose profile row is missing is rejected rather than
 * silently treated as unscoped, because an unscoped read is exactly the leak
 * this exists to prevent.
 * @param caller The authenticated caller.
 * @returns The scope to filter every query by.
 * @throws ForbiddenException If the caller's role implies an organization it
 * has not been linked to.
 */
export function resolveScope(caller: AuthenticatedUser): OrgScope {
  if (caller.role === UserRole.ADMIN) {
    return { retailerId: null, recipientId: null, isAdmin: true };
  }

  if (caller.role === UserRole.RETAILER) {
    if (!caller.retailerId) {
      throw new ForbiddenException(
        'This account is not linked to a retailer yet.',
      );
    }

    return { retailerId: caller.retailerId, recipientId: null, isAdmin: false };
  }

  if (!caller.recipientId) {
    throw new ForbiddenException(
      'This account is not linked to a recipient yet.',
    );
  }

  return { retailerId: null, recipientId: caller.recipientId, isAdmin: false };
}

/**
 * Asserts the caller acts for the given retailer.
 * @param caller The authenticated caller.
 * @param retailerId The retailer the request touches.
 * @throws ForbiddenException If the caller belongs to a different retailer.
 */
export function assertRetailerScope(
  caller: AuthenticatedUser,
  retailerId: string,
): void {
  const scope = resolveScope(caller);

  if (!scope.isAdmin && scope.retailerId !== retailerId) {
    throw new ForbiddenException(
      'This record belongs to another organization.',
    );
  }
}

/**
 * Asserts the caller acts for the given recipient.
 * @param caller The authenticated caller.
 * @param recipientId The recipient the request touches.
 * @throws ForbiddenException If the caller belongs to a different recipient.
 */
export function assertRecipientScope(
  caller: AuthenticatedUser,
  recipientId: string,
): void {
  const scope = resolveScope(caller);

  if (!scope.isAdmin && scope.recipientId !== recipientId) {
    throw new ForbiddenException(
      'This record belongs to another organization.',
    );
  }
}

/**
 * Asserts the caller is one of the two parties to a donation.
 *
 * Both sides read the same donation, so neither a retailer nor a recipient
 * filter alone is sufficient.
 * @param caller The authenticated caller.
 * @param donation The retailer and recipient the donation is between.
 * @throws ForbiddenException If the caller is party to neither side.
 */
export function assertDonationParty(
  caller: AuthenticatedUser,
  donation: { retailerId: string; recipientId: string },
): void {
  const scope = resolveScope(caller);

  if (scope.isAdmin) {
    return;
  }

  if (
    scope.retailerId === donation.retailerId ||
    scope.recipientId === donation.recipientId
  ) {
    return;
  }

  throw new ForbiddenException(
    'This donation belongs to another organization.',
  );
}
