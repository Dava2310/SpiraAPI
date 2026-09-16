import { Test, TestingModule } from '@nestjs/testing';

import { InvalidTokensController } from './invalid-tokens.controller.js';
import { InvalidTokensService } from './invalid-tokens.service.js';

describe('InvalidTokensController', () => {
  let controller: InvalidTokensController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvalidTokensController],
      providers: [{ provide: InvalidTokensService, useValue: {} }],
    }).compile();

    controller = module.get<InvalidTokensController>(InvalidTokensController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
