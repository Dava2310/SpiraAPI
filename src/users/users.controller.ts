import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { MessageResponseDto } from '../common/dto/index.js';
import {
  CreateUserDto,
  UpdateUserDto,
  UserCreatedResponseDto,
  UserResponseDto,
} from './dto/index.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieves every user, each mapped to a UserResponseDto.
   * @returns A Promise that resolves with an array of UserResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({
    description: 'List of all users.',
    type: [UserResponseDto],
  })
  async findAll(): Promise<UserResponseDto[]> {
    return await this.usersService.findAll();
  }

  /**
   * Retrieves a user by its ID.
   * @param id The ID of the user to look up.
   * @returns A Promise that resolves with the user found as UserResponseDto.
   * @throws NotFoundException If the user is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single user' })
  @ApiParam({ name: 'id', description: 'User ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'User found.',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return await this.usersService.findOne(id);
  }

  /**
   * Creates a user. The password is hashed before storage.
   * @param createUserDto The data to create the user with.
   * @returns A Promise that resolves with the created user as UserCreatedResponseDto.
   * @throws BadRequestException If the email is already taken, or the profile
   * link does not match the role.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({
    type: CreateUserDto,
    description: 'Data to create a new user.',
  })
  @ApiCreatedResponse({
    description: 'The user has been created successfully.',
    type: UserCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data — duplicated email, or profile link does not match the role.',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserCreatedResponseDto> {
    return await this.usersService.create(createUserDto);
  }

  /**
   * Updates a user found by its ID.
   * @param id The ID of the user to update.
   * @param updateUserDto The new data for the user.
   * @returns A Promise that resolves with the updated user as UserCreatedResponseDto.
   * @throws NotFoundException If the user is not found.
   * @throws BadRequestException If the email is taken by another user, or the
   * resulting profile link does not match the role.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({
    name: 'id',
    description: 'ID of the user to update',
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'New data for the user.',
  })
  @ApiOkResponse({
    description: 'User updated successfully.',
    type: UserCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiBadRequestResponse({
    description:
      'Invalid data — duplicated email, or profile link does not match the role.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserCreatedResponseDto> {
    return await this.usersService.update(id, updateUserDto);
  }

  /**
   * Soft-deletes a user found by its ID.
   * @param id The ID of the user to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the user is not found.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by its ID' })
  @ApiParam({ name: 'id', description: 'User ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'User deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.usersService.remove(id);
  }
}
