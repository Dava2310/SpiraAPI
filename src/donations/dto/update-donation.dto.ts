import { PartialType } from '@nestjs/swagger';
import { CreateDonationDto } from './create-donation.dto.js';

export class UpdateDonationDto extends PartialType(CreateDonationDto) {}
