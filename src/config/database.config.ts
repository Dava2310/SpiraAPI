import { buildSslOptions } from '../common/database/ssl.options.js';

export default () => {
  const databaseUrl = process.env.DATABASE_URL;
  const synchronize = process.env.DB_SYNCHRONIZE === 'true';
  const logging = process.env.DB_LOGGING === 'true';
  const ssl = buildSslOptions();

  if (databaseUrl) {
    return {
      database: {
        type: 'postgres' as const,
        url: databaseUrl.trim(),
        uuidExtension: 'pgcrypto' as const,
        ssl,
        synchronize,
        logging,
      },
    };
  }

  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  const username = process.env.POSTGRES_USER || 'spira';
  const password = process.env.POSTGRES_PASSWORD || 'spira_secret';
  const database = process.env.POSTGRES_DB || 'spira_db';

  return {
    database: {
      type: 'postgres' as const,
      host,
      port,
      username,
      password,
      database,
      uuidExtension: 'pgcrypto' as const,
      ssl,
      synchronize,
      logging,
    },
  };
};
