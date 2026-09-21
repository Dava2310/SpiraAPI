import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImpactFactor } from './entities/impact-factor.entity.js';
import { ImpactFactorsController } from './impact-factors.controller.js';
import { ImpactFactorsService } from './impact-factors.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ImpactFactor])],
  controllers: [ImpactFactorsController],
  providers: [ImpactFactorsService],
  exports: [ImpactFactorsService],
})
export class ImpactFactorsModule {}
