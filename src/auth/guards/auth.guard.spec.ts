import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { InvalidTokensService } from '../../invalid-tokens/invalid-tokens.service.js';
import { UsersService } from '../../users/users.service.js';
import { AuthGuard } from './auth.guard.js';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: {} },
        { provide: Reflector, useValue: new Reflector() },
        { provide: InvalidTokensService, useValue: {} },
        { provide: UsersService, useValue: {} },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
