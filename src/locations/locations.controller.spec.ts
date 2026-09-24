import { Test, TestingModule } from '@nestjs/testing';

import { LocationsController } from './locations.controller.js';
import { LocationsService } from './locations.service.js';
import { LocationPickupSlotsService } from '../location-pickup-slots/location-pickup-slots.service.js';

describe('LocationsController', () => {
  let controller: LocationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        { provide: LocationsService, useValue: {} },
        { provide: LocationPickupSlotsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
