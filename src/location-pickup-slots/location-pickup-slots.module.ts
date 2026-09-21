import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LocationPickupSlot } from './entities/location-pickup-slot.entity.js';
import { LocationPickupSlotsController } from './location-pickup-slots.controller.js';
import { LocationPickupSlotsService } from './location-pickup-slots.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([LocationPickupSlot])],
  controllers: [LocationPickupSlotsController],
  providers: [LocationPickupSlotsService],
  exports: [LocationPickupSlotsService],
})
export class LocationPickupSlotsModule {}
