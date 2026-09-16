import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Mensaje de respuesta',
    example: 'Solicitud exitosa',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
