# Spira API

Backend REST API for **Spira**, built with [NestJS](https://nestjs.com/) 12 (ESM), TypeORM and PostgreSQL.
Ships with OpenAPI/Swagger documentation and a generator that builds a typed API client for the frontend.

**Stack:** NestJS 12 · TypeScript 6 (ESM) · TypeORM 1 · PostgreSQL 16 · Vitest · oxlint · pnpm

---

## Requirements

| Tool | Version | Needed for |
|---|---|---|
| Node.js | >= 22 | Runtime (`import.meta.dirname`, native ESM) |
| pnpm | >= 10 | Package manager |
| Docker | any recent | Running the PostgreSQL container |
| Java | >= 11 | Only for `build:client` (the OpenAPI generator is a Java tool) |

---

## Quick start

```bash
pnpm install                                        # 1. install dependencies
cp .env.example .env                                # 2. create your local env file
docker compose -f docker-compose.db.yml up -d       # 3. start PostgreSQL (port 5433)
pnpm start:dev                                      # 4. run the API in watch mode
```

Then open:

| URL | What |
|---|---|
| `http://localhost:3333/docs` | Swagger UI |
| `http://localhost:3333/docs-json` | Raw OpenAPI spec (JSON) |
| `http://localhost:3333/api` | Liveness check (returns a string) |

> All routes are served under the **`/api`** global prefix. Swagger is mounted
> separately at `/docs` so it does not shadow the liveness route.

---

## Environment variables

Copy `.env.example` to `.env` and adjust. The API loads `.env`, `.env.development` and `.env.production` (in that order) via `@nestjs/config`.

### Active — read by the code

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port the API listens on. `.env.example` sets `3333`. |
| `DATABASE_URL` | – | Full Postgres connection string. **Takes precedence over every `POSTGRES_*` variable.** |
| `DB_SYNCHRONIZE` | `false` | `true` lets TypeORM create/update tables from your entities automatically. Dev only. |
| `DB_LOGGING` | `false` | `true` logs every SQL statement. |
| `CORS_ORIGIN` | `*` | Space-separated list of allowed origins. |
| `ACCESS_TOKEN_SECRET` | `secret` | JWT access token secret. |
| `REFRESH_TOKEN_SECRET` | `refresh` | JWT refresh token secret. |

### Fallback — used only when `DATABASE_URL` is **unset**

`POSTGRES_HOST` · `POSTGRES_PORT` · `POSTGRES_USER` · `POSTGRES_PASSWORD` · `POSTGRES_DB`

`POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` are **also** read by `docker-compose.db.yml` to provision the container. `POSTGRES_PORT` is not — the host port is fixed at `5433` in the compose file.

> ⚠️ **Common gotcha:** while `DATABASE_URL` is set, editing `POSTGRES_HOST`/`POSTGRES_PORT`/etc. changes nothing for the API. Comment `DATABASE_URL` out to use the discrete variables.

### Placeholders — not yet wired to any code

`SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS` · `SMTP_FROM` · `SMTP_SECURE` · `SMTP_SERVICE` · `TOKEN_EXPIRATION_HOURS` · `SECURE_COOKIE`

Reserved for future mail and cookie support. Setting them today has no effect.

---

## Database

PostgreSQL runs in Docker, published on host port **`5433`** to avoid clashing with a local Postgres on `5432`.

```bash
docker compose -f docker-compose.db.yml up -d      # start (add --wait to block until healthy)
docker compose -f docker-compose.db.yml ps         # status
docker compose -f docker-compose.db.yml logs -f    # follow logs
docker compose -f docker-compose.db.yml down       # stop, keep data
docker compose -f docker-compose.db.yml down -v    # stop and DELETE the data volume
```

Data lives in the named volume `spira-api_postgres_data` and survives `down`. Verify connectivity directly:

```bash
psql "postgresql://spira:spira_secret@localhost:5433/spira_db" -c "select version();"
```

---

## Migrations

Migrations live in `src/database/migrations/` and use the data source at `src/database/data-source.ts`.
The TypeORM CLI runs through [`tsx`](https://tsx.is/), so `.ts` migrations execute directly — no build step.

| Command | What it does |
|---|---|
| `pnpm migration:create src/database/migrations/<Name>` | Create an **empty** migration (write the SQL yourself). |
| `pnpm migration:generate src/database/migrations/<Name>` | **Diff** your entities against the live DB and write the SQL for you. Requires a running DB. |
| `pnpm migration:run` | Apply all pending migrations. |
| `pnpm migration:revert` | Roll back the last applied migration. |
| `pnpm migration:show` | List migrations and which are applied. Handy as a connection smoke test. |

### `synchronize` vs. migrations

`DB_SYNCHRONIZE=true` makes TypeORM reshape the schema from your entities on every boot. It's convenient while sketching entities, but it can silently drop columns and it conflicts with migrations.

**Recommended flow:** keep it `true` while modeling, then before any real data exists switch to `false` and lock the schema in:

```bash
# in .env -> DB_SYNCHRONIZE = false
pnpm migration:generate src/database/migrations/InitialSchema
pnpm migration:run
```

---

## OpenAPI & the frontend API client

`pnpm build:client` turns the API's routes and DTOs into a **ready-to-use, fully typed TypeScript client** that you drop into the frontend — so the frontend calls `api.getUsers()` instead of hand-writing `fetch` calls and response types.

It runs in two steps:

```bash
pnpm generate:swagger   # 1. boots the app, writes the OpenAPI spec to ./swagger.json
pnpm build:client       # 2. runs step 1, then generates ./generated/api-client
```

| Step | Tool | Output |
|---|---|---|
| 1 | `src/generate-swagger.ts` (via `tsx`) | `swagger.json` |
| 2 | `@openapitools/openapi-generator-cli` (`typescript-axios`) | `generated/api-client/` — `apis/`, `models/`, `configuration.ts` |

Generator behaviour is configured in `openapi/config.json` (camelCase models, separate `apis/`+`models/` folders, axios) and the generator version is pinned in `openapitools.json`.

**Two things to know:**

1. **A running database is required.** `generate:swagger` boots the real `AppModule`, which connects via TypeORM. Start the DB first.
2. **The spec's paths do not include the `/api` prefix** (`/users`, not `/api/users`). That's intentional — the frontend supplies it once through the client's `basePath`:

   ```ts
   new Configuration({ basePath: 'http://localhost:3333/api' })
   ```

`generated/` is git-ignored; regenerate it whenever endpoints or DTOs change.

---

## Build & run

```bash
pnpm start          # run once
pnpm start:dev      # watch mode (recommended for development)
pnpm start:debug    # watch mode + debugger attached
pnpm build          # compile TypeScript to ./dist
pnpm start:prod     # run the compiled build (node dist/main)
```

---

## Testing & code quality

```bash
pnpm test            # unit tests (Vitest)
pnpm test:watch      # watch mode
pnpm test:cov        # coverage report
pnpm test:e2e        # end-to-end tests

pnpm lint            # oxlint, autofixing what it can
pnpm lint:check      # oxlint, report only (CI)
pnpm format          # Prettier, write
pnpm check:format-lint   # format + lint checks, no writes (CI)
```

---

## Project structure

```
src/
├── common/              # Shared building blocks
│   ├── dto/             #   Reusable DTOs (e.g. MessageResponseDto)
│   └── use-case/        #   Shared contracts (e.g. CrudRepository)
├── config/              # Namespaced config, loaded by @nestjs/config
│   ├── app.config.ts        #   app.port
│   ├── database.config.ts   #   database.* (TypeORM connection)
│   ├── jwt.config.ts        #   jwt.*
│   └── configuration.ts     #   aggregates the three above
├── database/
│   ├── data-source.ts   # TypeORM DataSource used by the CLI
│   └── migrations/      # Migration files
├── generate-swagger.ts  # Writes swagger.json (used by build:client)
├── main.ts              # Bootstrap: pipes, logger, CORS, /api prefix, Swagger
└── app.module.ts        # Root module: ConfigModule + TypeOrmModule

openapi/config.json      # OpenAPI generator options
openapitools.json        # Pinned generator version
docker-compose.db.yml    # PostgreSQL service
```

Entities are auto-discovered: any `*.entity.ts` under `src/` is picked up by both the app (`autoLoadEntities`) and the CLI data source.
