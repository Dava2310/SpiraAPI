import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { InvalidToken } from './entities/invalid-token.entity.js';
import { InvalidTokensService } from './invalid-tokens.service.js';

describe('InvalidTokensService', () => {
  let service: InvalidTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvalidTokensService,
        { provide: getRepositoryToken(InvalidToken), useValue: {} },
      ],
    }).compile();

    service = module.get<InvalidTokensService>(InvalidTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
