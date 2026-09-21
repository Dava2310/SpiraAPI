import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImpactFactorsModule } from '../impact-factors/impact-factors.module.js';
import { DonationReceiptsController } from './donation-receipts.controller.js';
import { DonationReceiptsService } from './donation-receipts.service.js';
import { DonationReceipt } from './entities/donation-receipt.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([DonationReceipt]), ImpactFactorsModule],
  controllers: [DonationReceiptsController],
  providers: [DonationReceiptsService],
  exports: [DonationReceiptsService],
})
export class DonationReceiptsModule {}
