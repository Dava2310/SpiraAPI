import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from '../contacts/entities/contact.entity.js';
import { ImpactModule } from '../impact/impact.module.js';
import { Location } from '../locations/entities/location.entity.js';
import { Recipient } from '../recipients/entities/recipient.entity.js';
import { Retailer } from '../retailers/entities/retailer.entity.js';
import { User } from '../users/entities/user.entity.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Retailer, Recipient, Location, Contact]),
    ImpactModule,
  ],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
