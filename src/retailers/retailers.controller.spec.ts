import { Test, TestingModule } from '@nestjs/testing';

import { RetailersController } from './retailers.controller.js';
import { RetailersService } from './retailers.service.js';

describe('RetailersController', () => {
  let controller: RetailersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RetailersController],
      providers: [{ provide: RetailersService, useValue: {} }],
    }).compile();

    controller = module.get<RetailersController>(RetailersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
