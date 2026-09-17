import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import {
  CreateUserDto,
  UpdateUserDto,
  UserCreatedResponseDto,
  UserResponseDto,
} from './dto/index.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './enums/user-role.enum.js';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Business logic for the User entity. Implements {@link CrudRepository} so the
 * "find a valid record or throw" contract is the same across modules.
 */
@Injectable()
export class UsersService implements CrudRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Finds a User by its ID. "Valid" means present and not soft-deleted, which
   * TypeORM enforces through the entity's `@DeleteDateColumn`.
   * @param id The ID of the User to look up.
   * @returns A Promise that resolves with the User found.
   * @throws NotFoundException If the User does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<User> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid User ID: ${id}`);
    }

    const user = await this.userRepository.findOne({ where: { id: uuid } });

    if (!user) {
      throw new NotFoundException(`User with ID: ${id} not found or not valid`);
    }

    return user;
  }

  /**
   * Retrieves every user that is not soft-deleted.
   * @returns A Promise that resolves with all users mapped to UserResponseDto.
   */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => new UserResponseDto(user));
  }

  /**
   * Retrieves a single user by its ID.
   * @param id The ID of the user to look up.
   * @returns A Promise that resolves with the user mapped to UserResponseDto.
   * @throws NotFoundException If the user is not found.
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.findValid(id);

    return new UserResponseDto(user);
  }

  /**
   * Finds a user by email, including the password hash, which the entity
   * excludes from ordinary reads. Intended for the login flow.
   * @param email The email to search for.
   * @returns A Promise that resolves with the user found, or null.
   */
  async findOneByEmailWithPassword(email: string): Promise<User | null> {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Finds a user by email.
   * @param email The email to search for.
   * @returns A Promise that resolves with the user found, or null.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * Finds a user by email, excluding one user from the search by its ID.
   * @param id The ID of the user to exclude from the search.
   * @param email The email to search for.
   * @returns A Promise that resolves with the user found, or null.
   */
  async findOneByEmailNotId(id: string, email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email, id: Not(id) },
    });
  }

  /**
   * Finds a user for the authentication path: present, not soft-deleted, and
   * returned as null rather than throwing, so the guard can answer 401.
   * @param id The ID taken from the token's `sub` claim.
   * @returns A Promise that resolves with the user found, or null.
   */
  async findValidForAuth(id: string): Promise<User | null> {
    if (!UUID_PATTERN.test(id)) {
      return null;
    }

    return await this.userRepository.findOne({ where: { id } });
  }

  /**
   * Stamps a successful sign-in on the user.
   * @param user The user that just signed in.
   * @returns A Promise that resolves once the timestamp is stored.
   */
  async recordLogin(user: User): Promise<void> {
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });
  }

  /**
   * Replaces a user's password hash. Callers are responsible for having
   * verified the current password first.
   * @param user The user whose password is changing.
   * @param newPassword The new plain-text password.
   * @returns A Promise that resolves with a success message.
   */
  async changePassword(
    user: User,
    newPassword: string,
  ): Promise<MessageResponseDto> {
    await this.userRepository.update(user.id, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS),
    });

    return new MessageResponseDto('Password updated successfully.');
  }

  /**
   * Creates a user, hashing the password before storage.
   * @param createUserDto The data to create the user with.
   * @returns A Promise that resolves with the created user and a success message.
   * @throws BadRequestException If the email is taken, or the profile link does
   * not match the role.
   */
  async create(createUserDto: CreateUserDto): Promise<UserCreatedResponseDto> {
    const { email, password, role, retailerId, recipientId } = createUserDto;

    const duplicatedUser = await this.findOneByEmail(email);

    if (duplicatedUser) {
      throw new BadRequestException(
        `A user already exists with the email: ${email}`,
      );
    }

    this.assertProfileMatchesRole(role, retailerId, recipientId);

    const user = this.userRepository.create({
      email,
      role,
      retailerId: retailerId ?? null,
      recipientId: recipientId ?? null,
      passwordHash: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
    });

    const newUser = await this.userRepository.save(user);

    return new UserCreatedResponseDto(newUser, 'User created successfully.');
  }

  /**
   * Updates a user found by its ID.
   * @param id The ID of the user to update.
   * @param updateUserDto The new data for the user.
   * @returns A Promise that resolves with the updated user and a success message.
   * @throws NotFoundException If the user is not found.
   * @throws BadRequestException If the email is taken by another user, or the
   * resulting profile link does not match the role.
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserCreatedResponseDto> {
    const { email, password, role, retailerId, recipientId } = updateUserDto;

    const user = await this.findValid(id);

    if (email) {
      const duplicatedUser = await this.findOneByEmailNotId(user.id, email);

      if (duplicatedUser) {
        throw new BadRequestException(
          `Another user is already registered with the email: ${email}`,
        );
      }

      user.email = email;
    }

    if (role !== undefined) {
      user.role = role;
    }

    if (retailerId !== undefined) {
      user.retailerId = retailerId;
    }

    if (recipientId !== undefined) {
      user.recipientId = recipientId;
    }

    this.assertProfileMatchesRole(user.role, user.retailerId, user.recipientId);

    if (password) {
      user.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }

    const updatedUser = await this.userRepository.save(user);

    return new UserCreatedResponseDto(
      updatedUser,
      'User updated successfully.',
    );
  }

  /**
   * Soft-deletes a user, so the row is kept for historical records and its
   * email can be reused.
   * @param id The ID of the user to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the user is not found.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const user = await this.findValid(id);

    await this.userRepository.softRemove(user);

    return new MessageResponseDto('User deleted successfully.');
  }

  /**
   * Checks the pairing the `chk_user_role_profile` constraint enforces in the
   * database, so a mismatch is a 400 rather than a driver error.
   * @param role The role the user will end up with.
   * @param retailerId The retailer link, if any.
   * @param recipientId The recipient link, if any.
   * @throws BadRequestException If the role and the profile link disagree.
   */
  private assertProfileMatchesRole(
    role: UserRole,
    retailerId?: string | null,
    recipientId?: string | null,
  ): void {
    const expected: Record<UserRole, [boolean, boolean]> = {
      [UserRole.RETAILER]: [true, false],
      [UserRole.RECIPIENT]: [false, true],
      [UserRole.ADMIN]: [false, false],
    };

    const [needsRetailer, needsRecipient] = expected[role];

    if (needsRetailer !== (retailerId != null)) {
      throw new BadRequestException(
        `A user with role ${role} must ${needsRetailer ? 'have' : 'not have'} a retailerId.`,
      );
    }

    if (needsRecipient !== (recipientId != null)) {
      throw new BadRequestException(
        `A user with role ${role} must ${needsRecipient ? 'have' : 'not have'} a recipientId.`,
      );
    }
  }
}
