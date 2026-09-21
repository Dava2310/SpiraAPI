import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY, ROLES_KEY } from '../../common/decorators/index.js';
import type { RequestWithUser } from '../../common/interfaces/index.js';
import { UserRole } from '../../users/enums/user-role.enum.js';

/**
 * Enforces {@link Roles} on routes that declare it.
 *
 * Runs after AuthGuard, so `request.user` is already resolved. ADMIN passes
 * every check: it is the platform operator role, not an organization role.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Decides whether the caller's role satisfies the route.
   * @param context The execution context of the incoming request.
   * @returns `true` when the route declares no roles, or the caller holds one.
   * @throws ForbiddenException If the caller's role is not allowed.
   */
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (user.role === UserRole.ADMIN || required.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('Your role does not allow this action.');
  }
}
