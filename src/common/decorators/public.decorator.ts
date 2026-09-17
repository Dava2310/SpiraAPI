import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without authentication. Every route is protected
 * by default, because AuthGuard is registered globally.
 *
 * @example
 * @Public()
 * @Post('login')
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
