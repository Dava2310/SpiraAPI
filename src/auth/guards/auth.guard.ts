import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { IS_PUBLIC_KEY } from '../../common/decorators/index.js';
import type {
  JwtPayload,
  RequestWithUser,
} from '../../common/interfaces/index.js';
import { InvalidTokensService } from '../../invalid-tokens/invalid-tokens.service.js';
import { UsersService } from '../../users/users.service.js';

/**
 * Verifies the `Authorization: Bearer` token on every request, unless the route
 * is marked {@link Public}, and attaches the caller to `request.user`.
 *
 * A token is accepted only when it verifies, its `jti` is absent from the
 * `invalid_token` denylist, and its user is still active and not deleted.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly invalidTokensService: InvalidTokensService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Decides whether the request may continue.
   * @param context The execution context of the incoming request.
   * @returns `true` when the caller is authenticated, or the route is public.
   * @throws UnauthorizedException If the token is missing, invalid, revoked, or
   * its user can no longer sign in.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing.');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (error) {
      this.logger.debug(
        `Token verification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (!payload.sub || !payload.jti || !payload.exp) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (await this.invalidTokensService.findOneByJti(payload.jti)) {
      throw new UnauthorizedException('This session has been revoked.');
    }

    const user = await this.usersService.findValidForAuth(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account is not active.');
    }

    request.user = {
      id: user.id,
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    };

    return true;
  }

  /**
   * Reads the token from the `Authorization: Bearer` header.
   * @param request The incoming request.
   * @returns The token, or undefined when the header is absent or malformed.
   */
  private extractTokenFromHeader(request: RequestWithUser): string | undefined {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    return scheme === 'Bearer' && token ? token : undefined;
  }
}
