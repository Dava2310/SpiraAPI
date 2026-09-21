import { Test, TestingModule } from '@nestjs/testing';

import { PartnershipsController } from './partnerships.controller.js';
import { PartnershipsService } from './partnerships.service.js';

describe('PartnershipsController', () => {
  let controller: PartnershipsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnershipsController],
      providers: [{ provide: PartnershipsService, useValue: {} }],
    }).compile();

    controller = module.get<PartnershipsController>(PartnershipsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
