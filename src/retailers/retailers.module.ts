import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Retailer } from './entities/retailer.entity.js';
import { RetailersController } from './retailers.controller.js';
import { RetailersService } from './retailers.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Retailer])],
  controllers: [RetailersController],
  providers: [RetailersService],
  exports: [RetailersService],
})
export class RetailersModule {}
