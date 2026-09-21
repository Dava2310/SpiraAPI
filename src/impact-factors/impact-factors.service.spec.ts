import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ImpactFactor } from './entities/impact-factor.entity.js';

import { ImpactFactorsService } from './impact-factors.service.js';

describe('ImpactFactorsService', () => {
  let service: ImpactFactorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpactFactorsService,
        { provide: getRepositoryToken(ImpactFactor), useValue: {} },
      ],
    }).compile();

    service = module.get<ImpactFactorsService>(ImpactFactorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
