import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { InventoryItem } from '../entities/inventory-item.entity.js';
import { InventoryItemResponseDto } from './inventory-item-response.dto.js';

/** A stock lot together with a success message, returned by create and update. */
export class InventoryItemCreatedResponseDto extends InventoryItemResponseDto {
  @ApiProperty({
    description: 'Human-readable message describing the outcome.',
    example: 'Inventory item created successfully.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  constructor(data: InventoryItem, message: string) {
    super(data);
    this.message = message;
  }
}
