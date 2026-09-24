import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard, RolesGuard } from './auth/guards/index.js';
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
import { LocationPickupSlotsModule } from './location-pickup-slots/location-pickup-slots.module.js';
import { ImpactModule } from './impact/impact.module.js';
import { MeModule } from './me/me.module.js';
import { RetailerPortalModule } from './retailer-portal/retailer-portal.module.js';
import { RecipientPortalModule } from './recipient-portal/recipient-portal.module.js';

import configuration from './config/configuration.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
      envFilePath: ['.env', '.env.development', '.env.production'],
    }),
    // Exactly one bucket. Every throttler named here applies to every route and the
    // tightest one wins, so listing a strict named bucket alongside a loose one
    // silently applies the strict limit platform-wide. The tight limits belong on
    // their routes, as @Throttle overrides of this bucket.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
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
    // Before RecipientsModule: Express matches in registration order, so
    // `recipients/me/...` must be declared ahead of `recipients/:id`.
    RecipientPortalModule,
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
    LocationPickupSlotsModule,
    ImpactModule,
    MeModule,
    RetailerPortalModule,
  ],
  controllers: [AppController],
  // Guard order matters: AuthGuard resolves the caller, RolesGuard then reads
  // the role off it.
  providers: [
    AppService,
    // Ahead of AuthGuard: an unauthenticated flood should be turned away before it
    // costs a token lookup or a bcrypt comparison.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
