import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Donation } from './entities/donation.entity.js';
import { DonationLine } from './entities/donation-line.entity.js';
import { PickupToken } from './entities/pickup-token.entity.js';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity.js';
import { Partnership } from '../partnerships/entities/partnership.entity.js';
import { Contact } from '../contacts/entities/contact.entity.js';
import { DonationReceiptsService } from '../donation-receipts/donation-receipts.service.js';
import { DonationsService } from './donations.service.js';

describe('DonationsService', () => {
  let service: DonationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: getRepositoryToken(Donation), useValue: {} },
        { provide: getRepositoryToken(DonationLine), useValue: {} },
        { provide: getRepositoryToken(PickupToken), useValue: {} },
        { provide: getRepositoryToken(InventoryItem), useValue: {} },
        { provide: getRepositoryToken(Partnership), useValue: {} },
        { provide: getRepositoryToken(Contact), useValue: {} },
        { provide: DonationReceiptsService, useValue: {} },
      ],
    }).compile();

    service = module.get<DonationsService>(DonationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
