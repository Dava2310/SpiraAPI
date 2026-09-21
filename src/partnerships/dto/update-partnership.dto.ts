import { PartialType } from '@nestjs/swagger';
import { CreatePartnershipDto } from './create-partnership.dto.js';

export class UpdatePartnershipDto extends PartialType(CreatePartnershipDto) {}
