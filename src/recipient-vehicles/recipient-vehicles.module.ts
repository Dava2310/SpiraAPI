import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RecipientVehicle } from './entities/recipient-vehicle.entity.js';
import { RecipientVehiclesController } from './recipient-vehicles.controller.js';
import { RecipientVehiclesService } from './recipient-vehicles.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([RecipientVehicle])],
  controllers: [RecipientVehiclesController],
  providers: [RecipientVehiclesService],
  exports: [RecipientVehiclesService],
})
export class RecipientVehiclesModule {}
