import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DonationReceipt } from './entities/donation-receipt.entity.js';
import { ImpactFactorsService } from '../impact-factors/impact-factors.service.js';
import { DonationReceiptsService } from './donation-receipts.service.js';

describe('DonationReceiptsService', () => {
  let service: DonationReceiptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationReceiptsService,
        { provide: getRepositoryToken(DonationReceipt), useValue: {} },
        { provide: ImpactFactorsService, useValue: {} },
      ],
    }).compile();

    service = module.get<DonationReceiptsService>(DonationReceiptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
