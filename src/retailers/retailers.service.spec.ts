import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Retailer } from './entities/retailer.entity.js';
import { RetailersService } from './retailers.service.js';

describe('RetailersService', () => {
  let service: RetailersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetailersService,
        { provide: getRepositoryToken(Retailer), useValue: {} },
      ],
    }).compile();

    service = module.get<RetailersService>(RetailersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
