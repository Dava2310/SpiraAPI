import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Recipient } from './entities/recipient.entity.js';
import { RecipientsService } from './recipients.service.js';

describe('RecipientsService', () => {
  let service: RecipientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipientsService,
        { provide: getRepositoryToken(Recipient), useValue: {} },
      ],
    }).compile();

    service = module.get<RecipientsService>(RecipientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
