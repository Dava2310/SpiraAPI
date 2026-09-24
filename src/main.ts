import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      colors: true,
      json: true,
    }),
  });

  // Render terminates TLS in front of the app, so without this every request
  // reports the proxy's address and rate limiting would count the whole internet as
  // one client — worse than no limit, because it would lock everyone out together.
  // `1` trusts exactly one hop, which is what a single reverse proxy adds.
  if (process.env.TRUST_PROXY_HOPS) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
  }

  // Validation Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);

  // CORS
  const rawOrigin = configService.get<string>('CORS_ORIGIN') || '*';
  const corsOrigin = rawOrigin === '*' ? '*' : rawOrigin.split(' ');
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global prefix
  const globalPrefix = 'api';

  app.setGlobalPrefix(globalPrefix);

  const config = new DocumentBuilder()
    .setTitle('Spira API')
    .setDescription('Spira API')
    .setVersion('0.0.1')
    .addTag('api')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Mounted at /docs, not at the global prefix. Sharing `/api` with the route
  // tree meant Swagger's static handler shadowed the liveness route, so a health
  // check got an HTML bundle instead of a one-line answer.
  SwaggerModule.setup('docs', app, document);

  // Port
  const port = configService.get<number>('app.port') || 5000;

  await app.listen(port);

  // Application is running
  Logger.log(`Application is running on: http://localhost:${port}`);
}

await bootstrap();
