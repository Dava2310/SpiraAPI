import { PartialType } from '@nestjs/swagger';

import { CreateRetailerDto } from './create-retailer.dto.js';

export class UpdateRetailerDto extends PartialType(CreateRetailerDto) {}
