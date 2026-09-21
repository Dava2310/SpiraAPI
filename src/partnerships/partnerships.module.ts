import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Partnership } from './entities/partnership.entity.js';
import { PartnershipsController } from './partnerships.controller.js';
import { PartnershipsService } from './partnerships.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Partnership])],
  controllers: [PartnershipsController],
  providers: [PartnershipsService],
  exports: [PartnershipsService],
})
export class PartnershipsModule {}
