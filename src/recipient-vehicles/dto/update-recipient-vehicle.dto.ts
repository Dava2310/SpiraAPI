import { PartialType } from '@nestjs/swagger';
import { CreateRecipientVehicleDto } from './create-recipient-vehicle.dto.js';

export class UpdateRecipientVehicleDto extends PartialType(
  CreateRecipientVehicleDto,
) {}
