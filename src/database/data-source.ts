import 'dotenv/config';
import * as path from 'node:path';
import { DataSource } from 'typeorm';

import { buildSslOptions } from '../common/database/ssl.options.js';

// ESM has no `__dirname`; `import.meta.dirname` is its equivalent (Node >= 20.11).
const currentDir = import.meta.dirname;

const entities = [path.join(currentDir, '..', '**', '*.entity.{ts,js}')];
const migrations = [path.join(currentDir, 'migrations', '*.{ts,js}')];

const databaseUrl = process.env.DATABASE_URL;
const ssl = buildSslOptions();

export const AppDataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl.trim(),
        uuidExtension: 'pgcrypto',
        ssl,
        entities,
        migrations,
      }
    : {
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        username: process.env.POSTGRES_USER || 'spira',
        password: process.env.POSTGRES_PASSWORD || 'spira_secret',
        database: process.env.POSTGRES_DB || 'spira_db',
        uuidExtension: 'pgcrypto',
        ssl,
        entities,
        migrations,
      },
);
