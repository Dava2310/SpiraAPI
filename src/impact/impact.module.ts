import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Donation } from '../donations/entities/donation.entity.js';
import { ImpactFactorsModule } from '../impact-factors/impact-factors.module.js';
import { ImpactService } from './impact.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Donation]), ImpactFactorsModule],
  providers: [ImpactService],
  exports: [ImpactService],
})
export class ImpactModule {}
