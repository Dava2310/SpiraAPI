import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Contact } from '../entities/contact.entity.js';
import { ContactResponseDto } from './contact-response.dto.js';

/** A contact together with a success message, returned by create and update. */
export class ContactCreatedResponseDto extends ContactResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Contact created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: Contact, message: string) {
    super(data);
    this.message = message;
  }
}
