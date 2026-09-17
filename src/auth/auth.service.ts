import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { MessageResponseDto } from '../common/dto/index.js';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../common/interfaces/index.js';
import { InvalidTokenReason } from '../invalid-tokens/enums/invalid-token-reason.enum.js';
import { InvalidTokensService } from '../invalid-tokens/invalid-tokens.service.js';
import { UsersService } from '../users/users.service.js';
import { ChangePasswordDto, LoginDto, LoginResponseDto } from './dto/index.js';

/**
 * Sign-in, sign-out and password changes.
 *
 * Sessions are stateless access tokens. Revocation is server-side: the token's
 * `jti` goes onto the `invalid_token` denylist, which AuthGuard checks on every
 * request.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly invalidTokensService: InvalidTokensService,
  ) {}

  /**
   * Verifies credentials and issues an access token.
   * @param loginDto The email and password to check.
   * @returns A Promise that resolves with the token and the signed-in account.
   * @throws UnauthorizedException If the credentials are wrong or the account is
   * inactive. The message is deliberately identical in both cases, so it cannot
   * be used to discover which emails exist.
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    const user = await this.usersService.findOneByEmailWithPassword(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.usersService.recordLogin(user);

    const { accessToken, expiresAt } = this.signAccessToken(user.id);

    return new LoginResponseDto(
      user,
      accessToken,
      expiresAt,
      'Signed in successfully.',
    );
  }

  /**
   * Ends the caller's session by revoking the token they presented.
   * @param caller The authenticated caller, as resolved by AuthGuard.
   * @returns A Promise that resolves with a success message.
   */
  async logout(caller: AuthenticatedUser): Promise<MessageResponseDto> {
    await this.revokeToken(caller, InvalidTokenReason.LOGOUT);

    return new MessageResponseDto('Signed out successfully.');
  }

  /**
   * Changes the caller's own password and revokes the token they used, so the
   * next request has to sign in again with the new password.
   * @param caller The authenticated caller, as resolved by AuthGuard.
   * @param changePasswordDto The current and the new password.
   * @returns A Promise that resolves with a success message.
   * @throws UnauthorizedException If the current password does not match.
   */
  async changePassword(
    caller: AuthenticatedUser,
    changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.usersService.findValid(caller.id);
    const stored = await this.usersService.findOneByEmailWithPassword(
      user.email,
    );

    if (!stored || !(await bcrypt.compare(oldPassword, stored.passwordHash))) {
      throw new UnauthorizedException('The current password is incorrect.');
    }

    if (await bcrypt.compare(newPassword, stored.passwordHash)) {
      throw new UnauthorizedException(
        'The new password must be different from the current one.',
      );
    }

    await this.usersService.changePassword(user, newPassword);
    await this.revokeToken(caller, InvalidTokenReason.PASSWORD_CHANGE);

    return new MessageResponseDto(
      'Password updated successfully. Please sign in again.',
    );
  }

  /**
   * Signs an access token carrying the user's ID and a fresh `jti`.
   * @param userId The user the token authenticates.
   * @returns The signed token and the moment it expires.
   */
  private signAccessToken(userId: string): {
    accessToken: string;
    expiresAt: Date;
  } {
    const payload: JwtPayload = { sub: userId, jti: randomUUID() };
    const accessToken = this.jwtService.sign(payload);
    const { exp } = this.jwtService.decode<JwtPayload>(accessToken);

    return { accessToken, expiresAt: new Date((exp ?? 0) * 1000) };
  }

  /**
   * Adds the caller's current token to the denylist. Already-revoked tokens are
   * ignored, so repeating the call is harmless.
   * @param caller The authenticated caller, as resolved by AuthGuard.
   * @param reason Why the token is being revoked.
   * @returns A Promise that resolves once the token can no longer be used.
   */
  private async revokeToken(
    caller: AuthenticatedUser,
    reason: InvalidTokenReason,
  ): Promise<void> {
    if (await this.invalidTokensService.findOneByJti(caller.jti)) {
      return;
    }

    await this.invalidTokensService.create({
      jti: caller.jti,
      userId: caller.id,
      expiresAt: caller.expiresAt.toISOString(),
      reason,
    });
  }
}
