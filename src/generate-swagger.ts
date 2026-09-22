import { writeFileSync } from 'node:fs';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule);

  // Must match main.ts. Without it every path in the spec is missing the `/api`
  // prefix, so a client generated from this file calls `/auth/login` and 404s.
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Spira API Documentation')
    .setDescription('Spira API')
    .setVersion('0.0.1')
    .addTag('api')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  await app.close();
  console.log('OpenAPI specification written to ./swagger.json');
}

await generateSwagger();
