import type { TlsOptions } from 'node:tls';

/**
 * Builds the TypeORM `ssl` option from the environment.
 *
 * This cannot be expressed in `DATABASE_URL`: TypeORM's `parseConnectionUrl`
 * discards the query string before the driver sees it, so an `?sslmode=require`
 * is silently dropped and the connection is attempted in the clear. Managed
 * providers — Supabase, Neon, Heroku, RDS with `rds.force_ssl` — then refuse it.
 *
 * `DB_SSL_REJECT_UNAUTHORIZED` defaults to false because most managed providers
 * present a certificate chain that is not in the system CA store, which fails
 * verification. Set `DB_SSL_CA` to the provider's CA certificate and this to
 * true to get a properly verified connection.
 * @returns The TLS options, or false when SSL is disabled.
 */
export function buildSslOptions(): TlsOptions | false {
  if (process.env.DB_SSL !== 'true') {
    return false;
  }

  const ca = process.env.DB_SSL_CA?.trim();

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
    ...(ca ? { ca } : {}),
  };
}
