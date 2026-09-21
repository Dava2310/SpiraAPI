import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * Input for the retailer's Donate, Transfer and Add All actions.
 *
 * All three are one call: stage lots into whatever donation the branch has open,
 * creating one if it has none.
 */
export class AddLinesToOpenDonationDto {
  @ApiProperty({ description: 'The branch staging the stock.', format: 'uuid' })
  @IsNotEmpty({ message: 'The location ID cannot be empty.' })
  @IsUUID('4', { message: 'The location ID must be a valid UUID.' })
  locationId: string;

  @ApiProperty({
    description: 'The lots to stage.',
    type: [String],
    format: 'uuid',
  })
  @IsArray({ message: 'The inventory item IDs must be an array.' })
  @ArrayMinSize(1, { message: 'Stage at least one lot.' })
  @ArrayMaxSize(200, { message: 'At most 200 lots can be staged at once.' })
  @IsUUID('4', {
    each: true,
    message: 'Every inventory item ID must be a valid UUID.',
  })
  inventoryItemIds: string[];

  @ApiPropertyOptional({
    description:
      'Who to donate to. Omit to let the server pick the preferred active partner.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'The recipient ID must be a valid UUID.' })
  recipientId?: string;
}
