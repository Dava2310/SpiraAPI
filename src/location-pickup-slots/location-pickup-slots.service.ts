import { Injectable } from '@nestjs/common';
import { CreateLocationPickupSlotDto } from './dto/create-location-pickup-slot.dto.js';
import { UpdateLocationPickupSlotDto } from './dto/update-location-pickup-slot.dto.js';

@Injectable()
export class LocationPickupSlotsService {
  create(createLocationPickupSlotDto: CreateLocationPickupSlotDto) {
    return 'This action adds a new locationPickupSlot';
  }

  findAll() {
    return `This action returns all locationPickupSlots`;
  }

  findOne(id: number) {
    return `This action returns a #${id} locationPickupSlot`;
  }

  update(id: number, updateLocationPickupSlotDto: UpdateLocationPickupSlotDto) {
    return `This action updates a #${id} locationPickupSlot`;
  }

  remove(id: number) {
    return `This action removes a #${id} locationPickupSlot`;
  }
}
