import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from '../contacts/entities/contact.entity.js';
import { DonationReceiptsModule } from '../donation-receipts/donation-receipts.module.js';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity.js';
import { Partnership } from '../partnerships/entities/partnership.entity.js';
import { DonationsController } from './donations.controller.js';
import { DonationsService } from './donations.service.js';
import { DonationLine } from './entities/donation-line.entity.js';
import { Donation } from './entities/donation.entity.js';
import { PickupToken } from './entities/pickup-token.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Donation,
      DonationLine,
      PickupToken,
      InventoryItem,
      Partnership,
      Contact,
    ]),
    DonationReceiptsModule,
  ],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
