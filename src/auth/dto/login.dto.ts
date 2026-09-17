import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Credentials for signing in. */
export class LoginDto {
  @ApiProperty({
    description: 'Login email. Matched case-insensitively.',
    example: 'boss@real.com.py',
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: 'The email cannot be empty.' })
  @IsEmail({}, { message: 'You must provide a valid email address.' })
  @MaxLength(255, {
    message: 'The email cannot be longer than 255 characters.',
  })
  email: string;

  @ApiProperty({
    description: 'Account password.',
    example: 'Str0ng-P4ssw0rd',
    maxLength: 72,
  })
  @IsNotEmpty({ message: 'The password cannot be empty.' })
  @IsString({ message: 'The password must be a string.' })
  @MaxLength(72, {
    message: 'The password cannot be longer than 72 characters.',
  })
  password: string;
}
