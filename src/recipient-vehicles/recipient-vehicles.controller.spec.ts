import { Test, TestingModule } from '@nestjs/testing';

import { RecipientVehiclesController } from './recipient-vehicles.controller.js';
import { RecipientVehiclesService } from './recipient-vehicles.service.js';

describe('RecipientVehiclesController', () => {
  let controller: RecipientVehiclesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipientVehiclesController],
      providers: [{ provide: RecipientVehiclesService, useValue: {} }],
    }).compile();

    controller = module.get<RecipientVehiclesController>(
      RecipientVehiclesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
