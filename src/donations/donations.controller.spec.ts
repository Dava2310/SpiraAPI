import { Test, TestingModule } from '@nestjs/testing';

import { DonationsController } from './donations.controller.js';
import { DonationsService } from './donations.service.js';

describe('DonationsController', () => {
  let controller: DonationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonationsController],
      providers: [{ provide: DonationsService, useValue: {} }],
    }).compile();

    controller = module.get<DonationsController>(DonationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
