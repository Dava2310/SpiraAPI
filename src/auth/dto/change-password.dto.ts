import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Input for changing your own password. */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Your current password.',
    example: 'Str0ng-P4ssw0rd',
    maxLength: 72,
  })
  @IsNotEmpty({ message: 'The current password cannot be empty.' })
  @IsString({ message: 'The current password must be a string.' })
  @MaxLength(72, {
    message: 'The current password cannot be longer than 72 characters.',
  })
  oldPassword: string;

  @ApiProperty({
    description:
      'The new password. Must differ from the current one and meet the password policy.',
    example: 'Even-Str0nger-P4ss',
    minLength: 12,
    maxLength: 72,
  })
  @IsNotEmpty({ message: 'The new password cannot be empty.' })
  @IsString({ message: 'The new password must be a string.' })
  @MinLength(12, {
    message: 'The new password must be at least 12 characters long.',
  })
  @MaxLength(72, {
    message: 'The new password cannot be longer than 72 characters.',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'The new password must contain at least one lowercase letter, one uppercase letter and one digit.',
  })
  newPassword: string;
}
