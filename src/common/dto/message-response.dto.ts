import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Request completed successfully',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
