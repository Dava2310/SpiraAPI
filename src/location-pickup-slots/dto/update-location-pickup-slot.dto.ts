import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateLocationPickupSlotDto } from './create-location-pickup-slot.dto.js';

/** Input for editing a slot. The owning branch cannot be reassigned. */
export class UpdateLocationPickupSlotDto extends PartialType(
  OmitType(CreateLocationPickupSlotDto, ['locationId'] as const),
) {}
