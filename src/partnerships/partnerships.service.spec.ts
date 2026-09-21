import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Partnership } from './entities/partnership.entity.js';

import { PartnershipsService } from './partnerships.service.js';

describe('PartnershipsService', () => {
  let service: PartnershipsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnershipsService,
        { provide: getRepositoryToken(Partnership), useValue: {} },
      ],
    }).compile();

    service = module.get<PartnershipsService>(PartnershipsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
