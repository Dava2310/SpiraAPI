import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard } from './auth/guards/index.js';
import { RetailersModule } from './retailers/retailers.module.js';
import { RecipientsModule } from './recipients/recipients.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { UsersModule } from './users/users.module.js';
import { InvalidTokensModule } from './invalid-tokens/invalid-tokens.module.js';
import { ProductsModule } from './products/products.module.js';
import { InventoryItemsModule } from './inventory-items/inventory-items.module.js';
import { DonationsModule } from './donations/donations.module.js';
import { DonationReceiptsModule } from './donation-receipts/donation-receipts.module.js';
import { RecipientVehiclesModule } from './recipient-vehicles/recipient-vehicles.module.js';
import { PartnershipsModule } from './partnerships/partnerships.module.js';
import { ImpactFactorsModule } from './impact-factors/impact-factors.module.js';

import configuration from './config/configuration.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
      envFilePath: ['.env', '.env.development', '.env.production'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const database =
          configService.get<Record<string, unknown>>('database') ?? {};
        return {
          ...database,
          autoLoadEntities: true,
        };
      },
    }),
    AuthModule,
    RetailersModule,
    RecipientsModule,
    ContactsModule,
    LocationsModule,
    UsersModule,
    InvalidTokensModule,
    ProductsModule,
    InventoryItemsModule,
    DonationsModule,
    DonationReceiptsModule,
    RecipientVehiclesModule,
    PartnershipsModule,
    ImpactFactorsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
