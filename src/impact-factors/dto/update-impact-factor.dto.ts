import { PartialType } from '@nestjs/swagger';
import { CreateImpactFactorDto } from './create-impact-factor.dto.js';

export class UpdateImpactFactorDto extends PartialType(CreateImpactFactorDto) {}
