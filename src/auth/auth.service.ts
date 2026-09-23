import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../common/interfaces/index.js';
import { InvalidTokenReason } from '../invalid-tokens/enums/invalid-token-reason.enum.js';
import { InvalidTokensService } from '../invalid-tokens/invalid-tokens.service.js';
import { Contact } from '../contacts/entities/contact.entity.js';
import { ContactType } from '../contacts/enums/contact-type.enum.js';
import { Recipient } from '../recipients/entities/recipient.entity.js';
import { Retailer } from '../retailers/entities/retailer.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import {
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RegisterRecipientDto,
  RegisterRetailerDto,
} from './dto/index.js';

const BCRYPT_SALT_ROUNDS = 10;

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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registers a retailer together with its first login.
   *
   * One transaction: organization, user and contact all commit or none do. A
   * duplicate email discovered halfway through must not leave behind an orphaned
   * retailer that nobody can sign in to.
   *
   * The new organization is `PENDING_VERIFICATION` — the column default — which is
   * a badge rather than a gate: nothing in the API restricts what an unverified
   * organization may do.
   * @param dto The account, the company and the registering person's name.
   * @returns A Promise that resolves with a token, so the caller is signed in.
   * @throws ConflictException If the email or the tax ID is already registered.
   */
  async registerRetailer(dto: RegisterRetailerDto): Promise<LoginResponseDto> {
    const userId = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        await this.assertEmailFree(manager, dto.email);

        if (await manager.findOne(Retailer, { where: { taxId: dto.taxId } })) {
          throw new ConflictException(
            'A retailer with that tax ID is already registered. Ask a colleague to invite you instead.',
          );
        }

        const retailer = await manager.save(
          manager.create(Retailer, {
            legalName: dto.legalName,
            tradeName: dto.tradeName ?? null,
            taxId: dto.taxId,
            businessType: dto.businessType,
          }),
        );

        const user = await this.createOwner(manager, dto, UserRole.RETAILER, {
          retailerId: retailer.id,
        });

        await manager.save(
          manager.create(Contact, {
            retailerId: retailer.id,
            userId: user.id,
            fullName: dto.fullName,
            email: dto.email,
            phone: dto.phone ?? null,
            type: ContactType.PRIMARY,
            isPrimary: true,
          }),
        );

        return user.id;
      },
    );

    return await this.issueRegistrationSession(userId);
  }

  /**
   * Registers an NGO or foodbank together with its first login.
   *
   * Same transactional guarantee as {@link registerRetailer}. `taxId` and
   * `registrationCode` are optional here — a small community kitchen may have
   * neither — but each is checked when supplied, because both are unique.
   * @param dto The account, the organization and the registering person's name.
   * @returns A Promise that resolves with a token, so the caller is signed in.
   * @throws ConflictException If the email, tax ID or registration code is taken.
   */
  async registerRecipient(
    dto: RegisterRecipientDto,
  ): Promise<LoginResponseDto> {
    const userId = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        await this.assertEmailFree(manager, dto.email);

        if (
          dto.taxId &&
          (await manager.findOne(Recipient, { where: { taxId: dto.taxId } }))
        ) {
          throw new ConflictException(
            'An organization with that tax ID is already registered.',
          );
        }

        if (
          dto.registrationCode &&
          (await manager.findOne(Recipient, {
            where: { registrationCode: dto.registrationCode },
          }))
        ) {
          throw new ConflictException(
            'An organization with that registration code is already registered.',
          );
        }

        const recipient = await manager.save(
          manager.create(Recipient, {
            type: dto.type,
            displayName: dto.displayName,
            legalName: dto.legalName ?? null,
            taxId: dto.taxId ?? null,
            registrationCode: dto.registrationCode ?? null,
            serviceArea: dto.serviceArea ?? null,
            ...(dto.timezone ? { timezone: dto.timezone } : {}),
          }),
        );

        const user = await this.createOwner(manager, dto, UserRole.RECIPIENT, {
          recipientId: recipient.id,
        });

        await manager.save(
          manager.create(Contact, {
            recipientId: recipient.id,
            userId: user.id,
            fullName: dto.fullName,
            email: dto.email,
            phone: dto.phone ?? null,
            type: ContactType.PRIMARY,
            isPrimary: true,
          }),
        );

        return user.id;
      },
    );

    return await this.issueRegistrationSession(userId);
  }

  /**
   * Rejects an email that is already registered.
   *
   * Unlike sign-in, registration cannot hide whether an address exists — the
   * caller has to be told why it failed. The trade-off is deliberate.
   * @param manager The transaction to check within.
   * @param email The address being claimed.
   * @throws ConflictException If the address is taken.
   */
  private async assertEmailFree(
    manager: EntityManager,
    email: string,
  ): Promise<void> {
    if (await manager.findOne(User, { where: { email } })) {
      throw new ConflictException(
        'That email is already registered. Sign in instead, or use a different address.',
      );
    }
  }

  /**
   * Creates the organization's first user.
   * @param manager The transaction to write within.
   * @param dto The registration payload carrying the credentials.
   * @param role The role implied by which side registered.
   * @param profile The single profile link the role requires.
   * @returns A Promise that resolves with the stored user.
   */
  private async createOwner(
    manager: EntityManager,
    dto: { email: string; password: string },
    role: UserRole,
    profile: { retailerId?: string; recipientId?: string },
  ): Promise<User> {
    return await manager.save(
      manager.create(User, {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS),
        role,
        isActive: true,
        ...profile,
      }),
    );
  }

  /**
   * Signs the new account in, so registration does not end at a login form.
   * @param userId The user just created.
   * @returns A Promise that resolves with the token and the account.
   */
  private async issueRegistrationSession(
    userId: string,
  ): Promise<LoginResponseDto> {
    const user = await this.usersService.findValid(userId);
    const { accessToken, expiresAt } = this.signAccessToken(user.id);

    return new LoginResponseDto(
      user,
      accessToken,
      expiresAt,
      'Welcome to Spira. Your organization has been registered.',
    );
  }

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
