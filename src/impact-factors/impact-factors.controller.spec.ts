import { Test, TestingModule } from '@nestjs/testing';

import { ImpactFactorsController } from './impact-factors.controller.js';
import { ImpactFactorsService } from './impact-factors.service.js';

describe('ImpactFactorsController', () => {
  let controller: ImpactFactorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImpactFactorsController],
      providers: [{ provide: ImpactFactorsService, useValue: {} }],
    }).compile();

    controller = module.get<ImpactFactorsController>(ImpactFactorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
