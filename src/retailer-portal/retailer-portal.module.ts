import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Donation } from '../donations/entities/donation.entity.js';
import { ImpactFactorsModule } from '../impact-factors/impact-factors.module.js';
import { ImpactModule } from '../impact/impact.module.js';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { Partnership } from '../partnerships/entities/partnership.entity.js';
import { RetailerPortalController } from './retailer-portal.controller.js';
import { RetailerPortalService } from './retailer-portal.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, InventoryItem, Location, Partnership]),
    ImpactModule,
    ImpactFactorsModule,
  ],
  controllers: [RetailerPortalController],
  providers: [RetailerPortalService],
})
export class RetailerPortalModule {}
