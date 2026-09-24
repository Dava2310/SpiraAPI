import { ForbiddenException, NotFoundException } from '@nestjs/common';

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

/**
 * The `where` fragment that limits a query to the caller's own organization.
 *
 * For an entity owned by one side, pass only that side's column name. For one that
 * can belong to either — a contact, a location — pass both, and a caller matching
 * either is allowed.
 * @param caller The authenticated caller.
 * @returns An array of `where` fragments to OR together, or null for unrestricted
 * access.
 */
export function ownScopeWhere(
  caller: AuthenticatedUser,
  columns: { retailer?: string; recipient?: string },
): Record<string, string>[] | null {
  const scope = resolveScope(caller);

  if (scope.isAdmin) {
    return null;
  }

  const fragments: Record<string, string>[] = [];

  if (scope.retailerId && columns.retailer) {
    fragments.push({ [columns.retailer]: scope.retailerId });
  }

  if (scope.recipientId && columns.recipient) {
    fragments.push({ [columns.recipient]: scope.recipientId });
  }

  // No fragment means the caller's side has no column on this entity, so nothing
  // here is theirs. An impossible condition is safer than an unfiltered read.
  return fragments.length > 0 ? fragments : [{ id: IMPOSSIBLE_ID }];
}

/** A UUID no row will ever carry, used to force an empty result. */
const IMPOSSIBLE_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Asserts a row belongs to the caller's own organization.
 *
 * Throws "not found" rather than "forbidden", so a route cannot be used to confirm
 * that an id exists in another organization.
 * @param caller The authenticated caller.
 * @param row The row's ownership columns, as loaded.
 * @param label What to name in the error.
 * @throws NotFoundException If the row belongs to another organization.
 */
export function assertOwn(
  caller: AuthenticatedUser,
  row: { retailerId?: string | null; recipientId?: string | null },
  label: string,
): void {
  const scope = resolveScope(caller);

  if (scope.isAdmin) {
    return;
  }

  const mine =
    (scope.retailerId !== null && row.retailerId === scope.retailerId) ||
    (scope.recipientId !== null && row.recipientId === scope.recipientId);

  if (!mine) {
    throw new NotFoundException(`${label} not found`);
  }
}

/**
 * Asserts a caller may create a row under the given owner.
 *
 * Creation is the other half of ownership: without this a caller can file records
 * under another organization even when it cannot read them back.
 * @param caller The authenticated caller.
 * @param owner The retailer or recipient the new row would belong to.
 * @throws ForbiddenException If the owner is another organization.
 */
export function assertCanCreateFor(
  caller: AuthenticatedUser,
  owner: { retailerId?: string | null; recipientId?: string | null },
): void {
  const scope = resolveScope(caller);

  if (scope.isAdmin) {
    return;
  }

  if (owner.retailerId && owner.retailerId !== scope.retailerId) {
    throw new ForbiddenException(
      'You cannot file records under another organization.',
    );
  }

  if (owner.recipientId && owner.recipientId !== scope.recipientId) {
    throw new ForbiddenException(
      'You cannot file records under another organization.',
    );
  }
}
