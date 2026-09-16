import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RetailersModule } from './retailers/retailers.module.js';
import { RecipientsModule } from './recipients/recipients.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { UsersModule } from './users/users.module.js';
import { InvalidTokensModule } from './invalid-tokens/invalid-tokens.module.js';

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
    RetailersModule,
    RecipientsModule,
    ContactsModule,
    LocationsModule,
    UsersModule,
    InvalidTokensModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
