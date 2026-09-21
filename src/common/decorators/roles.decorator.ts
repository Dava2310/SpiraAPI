import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '../../users/enums/user-role.enum.js';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles. Without it a route is open to every
 * authenticated caller, which is the right default only for routes that scope
 * their own data.
 *
 * @example
 * @Roles(UserRole.RETAILER)
 * @Post('inventory-items')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
