import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { User } from '../entities/user.entity.js';
import { UserResponseDto } from './user-response.dto.js';

/** A user together with a success message, returned by create and update. */
export class UserCreatedResponseDto extends UserResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'User created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: User, message: string) {
    super(data);
    this.message = message;
  }
}
