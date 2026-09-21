import { PartialType } from '@nestjs/swagger';
import { CreateLocationPickupSlotDto } from './create-location-pickup-slot.dto.js';

export class UpdateLocationPickupSlotDto extends PartialType(
  CreateLocationPickupSlotDto,
) {}
