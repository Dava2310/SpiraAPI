import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LocationPickupSlotsService } from './location-pickup-slots.service.js';
import { CreateLocationPickupSlotDto } from './dto/create-location-pickup-slot.dto.js';
import { UpdateLocationPickupSlotDto } from './dto/update-location-pickup-slot.dto.js';

@Controller('location-pickup-slots')
export class LocationPickupSlotsController {
  constructor(
    private readonly locationPickupSlotsService: LocationPickupSlotsService,
  ) {}

  @Post()
  create(@Body() createLocationPickupSlotDto: CreateLocationPickupSlotDto) {
    return this.locationPickupSlotsService.create(createLocationPickupSlotDto);
  }

  @Get()
  findAll() {
    return this.locationPickupSlotsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationPickupSlotsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLocationPickupSlotDto: UpdateLocationPickupSlotDto,
  ) {
    return this.locationPickupSlotsService.update(
      +id,
      updateLocationPickupSlotDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.locationPickupSlotsService.remove(+id);
  }
}
