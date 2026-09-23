import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from '../contacts/entities/contact.entity.js';
import { InvalidTokensModule } from '../invalid-tokens/invalid-tokens.module.js';
import { Recipient } from '../recipients/entities/recipient.entity.js';
import { Retailer } from '../retailers/entities/retailer.entity.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './guards/index.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          // `expiresIn` is a template-literal type from `ms`, which a plain
          // config string cannot satisfy.
          expiresIn: (configService.get<string>('jwt.accessTokenExpiresIn') ??
            '2h') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
    TypeOrmModule.forFeature([Retailer, Recipient, Contact]),
    UsersModule,
    InvalidTokensModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
