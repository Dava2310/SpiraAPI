import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { RecipientVehicle } from './entities/recipient-vehicle.entity.js';

import { RecipientVehiclesService } from './recipient-vehicles.service.js';

describe('RecipientVehiclesService', () => {
  let service: RecipientVehiclesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipientVehiclesService,
        { provide: getRepositoryToken(RecipientVehicle), useValue: {} },
      ],
    }).compile();

    service = module.get<RecipientVehiclesService>(RecipientVehiclesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
