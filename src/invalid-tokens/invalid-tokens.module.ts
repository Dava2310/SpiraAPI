import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvalidToken } from './entities/invalid-token.entity.js';
import { InvalidTokensController } from './invalid-tokens.controller.js';
import { InvalidTokensService } from './invalid-tokens.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InvalidToken])],
  controllers: [InvalidTokensController],
  providers: [InvalidTokensService],
  exports: [InvalidTokensService],
})
export class InvalidTokensModule {}
