import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from '../contacts/entities/contact.entity.js';
import { DonationReceipt } from '../donation-receipts/entities/donation-receipt.entity.js';
import { Donation } from '../donations/entities/donation.entity.js';
import { PickupToken } from '../donations/entities/pickup-token.entity.js';
import { ImpactFactorsModule } from '../impact-factors/impact-factors.module.js';
import { ImpactModule } from '../impact/impact.module.js';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity.js';
import { LocationPickupSlot } from '../location-pickup-slots/entities/location-pickup-slot.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { Recipient } from '../recipients/entities/recipient.entity.js';
import { RecipientPortalController } from './recipient-portal.controller.js';
import { RecipientPortalService } from './recipient-portal.service.js';
import { ReservationsService } from './reservations.service.js';
import { SurplusService } from './surplus.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Recipient,
      Contact,
      Location,
      LocationPickupSlot,
      Donation,
      DonationReceipt,
      PickupToken,
      InventoryItem,
    ]),
    ImpactModule,
    ImpactFactorsModule,
  ],
  controllers: [RecipientPortalController],
  providers: [RecipientPortalService, ReservationsService, SurplusService],
})
export class RecipientPortalModule {}
