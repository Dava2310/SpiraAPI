import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Product } from '../entities/product.entity.js';
import { ProductResponseDto } from './product-response.dto.js';

/** A product together with a success message, returned by create and update. */
export class ProductCreatedResponseDto extends ProductResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Product created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: Product, message: string) {
    super(data);
    this.message = message;
  }
}
