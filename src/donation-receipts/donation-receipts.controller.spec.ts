import { Test, TestingModule } from '@nestjs/testing';

import { DonationReceiptsController } from './donation-receipts.controller.js';
import { DonationReceiptsService } from './donation-receipts.service.js';

describe('DonationReceiptsController', () => {
  let controller: DonationReceiptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonationReceiptsController],
      providers: [{ provide: DonationReceiptsService, useValue: {} }],
    }).compile();

    controller = module.get<DonationReceiptsController>(
      DonationReceiptsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
