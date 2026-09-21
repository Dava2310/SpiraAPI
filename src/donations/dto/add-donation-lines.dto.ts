import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

/** Input for putting more stock lots into an open donation. */
export class AddDonationLinesDto {
  @ApiProperty({
    description: 'Stock lots to add. Each becomes a line and is reserved.',
    type: [String],
    format: 'uuid',
    example: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  })
  @IsArray({ message: 'The inventory item IDs must be an array.' })
  @ArrayNotEmpty({ message: 'At least one inventory item ID is required.' })
  @ArrayUnique({ message: 'The inventory item IDs cannot contain duplicates.' })
  @ArrayMaxSize(200, { message: 'At most 200 stock lots are allowed.' })
  @IsUUID('4', {
    each: true,
    message: 'Each inventory item ID must be a valid UUID.',
  })
  inventoryItemIds: string[];
}
