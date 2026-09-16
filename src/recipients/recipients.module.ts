import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Recipient } from './entities/recipient.entity.js';
import { RecipientsController } from './recipients.controller.js';
import { RecipientsService } from './recipients.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Recipient])],
  controllers: [RecipientsController],
  providers: [RecipientsService],
  exports: [RecipientsService],
})
export class RecipientsModule {}
