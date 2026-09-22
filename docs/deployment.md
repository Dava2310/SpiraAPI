# Spira API — Database Deployment

How the schema gets onto a real PostgreSQL server, and how to keep it in sync
afterwards.

---

## 1. TypeORM vs Prisma — the mapping

If you know Prisma, this is the whole translation:

| Prisma | TypeORM | What it does |
|---|---|---|
| `prisma db push` | `synchronize: true` | Diffs entities against the live DB and mutates it. No files, no history. |
| `prisma migrate dev` | `pnpm migration:generate <Name>` | Diffs entities against the live DB and writes a migration file. |
| `prisma migrate deploy` | `pnpm migration:run` | Applies pending migration files. |
| `prisma migrate resolve` | `pnpm migration:show` | Lists which migrations are applied. |
| *(no equivalent)* | `pnpm migration:revert` | Rolls back the last applied migration. |
| `prisma migrate reset` | *(no equivalent)* | Drop and recreate the database by hand. |

Two differences that will catch you out:

1. **There is no schema file.** Prisma has `schema.prisma` as the single source of
   truth. In TypeORM the **entity classes are the schema** — the 18 files under
   `src/**/entities/*.entity.ts`. `migration:generate` reads those and diffs them
   against whatever database `DATABASE_URL` points at.
2. **`migration:generate` needs a live database to diff against.** Prisma can
   generate from the schema file alone; TypeORM connects, introspects, and emits
   the difference. Point it at an empty database to get a full initial schema, or
   at your current one to get just the delta.

---

## 2. Never use `synchronize` on a database you care about

`DB_SYNCHRONIZE=true` is fine for local development on a throwaway database. It
is **not** usable for deployment, and not merely as a matter of taste — it is
already broken on this schema:

```
QueryFailedError: enum label "DELI" already exists   (SQLSTATE 42710)
```

TypeORM's schema builder does not deduplicate enum types shared across columns.
Five of our enums are shared:

| Enum | Columns using it |
|---|---|
| `unit_of_measure` | `product.default_unit`, `inventory_item.unit`, `donation_line.unit` |
| `product_category` | `product.category`, `donation_line.category` |
| `profile_status` | `retailer.status`, `recipient.status` |
| `donation_reason` | `inventory_item.reason`, `donation_line.reason` |

When one of those enums changes, `synchronize` issues the `ALTER TYPE … ADD VALUE`
once per column and the second statement fails. Retrying cannot help.

**Set `DB_SYNCHRONIZE=false` on every deployed environment.**

---

## 3. The initial migration is hand-fixed — do not regenerate it blindly

`src/database/migrations/1790075757278-InitialSchema.ts` covers the whole schema:
16 tables, 16 enum types, 47 indexes, 11 check constraints, 36 foreign keys.

It was generated and then edited, for the same root cause as above. TypeORM emits
`CREATE TYPE` **once per column** rather than once per type, so the generated file
contained 21 `CREATE TYPE` statements for 16 types and failed on the sixth.

The fix, which the file's header comment also records:

- In `up()`, keep the **first** occurrence of each `CREATE TYPE` — the type must
  exist before the first table that uses it.
- In `down()`, keep the **last** occurrence of each `DROP TYPE` — the type must
  outlive the last table that references it. Keeping the first instead fails with
  `cannot drop type profile_status because other objects depend on it`.

If you regenerate this migration you reintroduce both faults. The same applies to
any future migration that adds or changes a shared enum: **check the generated SQL
for duplicate `CREATE TYPE` / `ALTER TYPE` statements before applying it.**

### Verified

Against a throwaway database, the migration was confirmed to:

- apply cleanly from empty, producing 16 tables;
- roll back cleanly, leaving 0 tables and 0 enum types;
- re-apply cleanly;
- produce a schema **identical** to `synchronize` — compared element by element:
  16 tables, 271 columns with defaults, 16 enum types with labels, 47 named
  indexes, 11 check constraints, 36 foreign keys with matching delete rules;
- boot the app with `DB_SYNCHRONIZE=false`, 121 routes, `GET /api` → 200.

---

## 4. Deploying the schema

### 4.1 Local and CI (TypeScript, via `tsx`)

```bash
export DATABASE_URL="postgres://user:pass@host:5432/dbname"

pnpm migration:show        # what is applied
pnpm migration:run         # apply everything pending
pnpm migration:revert      # undo the last one
```

### 4.2 Production (compiled, no `tsx`)

**`tsx` is a devDependency.** A server that installs with `--prod` or
`NODE_ENV=production` will not have it, and the scripts above will fail with
"command not found". Use the compiled data source instead:

```bash
pnpm build                 # emits dist/, including dist/database/migrations/
pnpm migration:run:prod    # node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
```

Or in one step:

```bash
pnpm deploy:migrate        # build + migrate
```

`migration:show:prod` and `migration:revert:prod` exist for the same reason.

### 4.3 Creating a new migration after changing an entity

```bash
# 1. Point at a database that is currently up to date
export DATABASE_URL="postgres://...localhost.../spira_db"

# 2. Generate the delta
pnpm migration:generate src/database/migrations/AddDriverNotes

# 3. READ THE GENERATED SQL. Always. Specifically check for:
#    - duplicate CREATE TYPE / ALTER TYPE on a shared enum (§3)
#    - a column drop you did not intend
#    - a NOT NULL added without a DEFAULT, which fails on a non-empty table

# 4. Apply and test the rollback too
pnpm migration:run
pnpm migration:revert
pnpm migration:run
```

Commit the migration file. It is part of the source, not a build artefact.

---

## 5. Environment variables

| Variable | Deployed value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` | Takes precedence over the discrete `POSTGRES_*` variables. **Do not put `?sslmode=` here — TypeORM strips the query string (§6).** URL-encode the password. |
| `DB_SSL` | **`true`** | Required by every managed provider. The only way to enable TLS (§6). |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` | Set `true` with `DB_SSL_CA` for a verified chain. |
| `DB_SYNCHRONIZE` | **`false`** | Non-negotiable (§2). |
| `DB_LOGGING` | `false` | `true` logs every query; useful for a bad afternoon, not for production. |
| `ACCESS_TOKEN_SECRET` | a long random string | Rotate it and every live session is revoked. |
| `TOKEN_EXPIRATION_HOURS` | `8` | |
| `CORS_ORIGIN` | the two frontend origins, space-separated | |
| `PORT` | provider-assigned | Render and most PaaS inject this; the app reads it. |

`pgcrypto` is required — the schema uses `gen_random_uuid()` for primary keys.
TypeORM is configured with `uuidExtension: 'pgcrypto'` and will create the
extension, but that needs a role with rights to do so. On a managed provider that
restricts extensions, enable it once by hand:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

On PostgreSQL 13+ `gen_random_uuid()` is built in, so this is usually a no-op.

---

## 6. Supabase — three things that will cost you an afternoon

### `?sslmode=require` in the URL does nothing

TypeORM's `parseConnectionUrl` **discards the query string** before the driver
sees it — it slices the URL at the first `?` and returns only host, port, user,
password and database. An `?sslmode=require` is silently dropped, the connection
is attempted unencrypted, and Supabase refuses it.

Use the environment variable instead:

```dotenv
DB_SSL = true
DB_SSL_REJECT_UNAUTHORIZED = false
```

`rejectUnauthorized` defaults to false because Supabase's certificate chain is not
in the system CA store. For a properly verified connection, download the project's
CA certificate from *Project Settings → Database → SSL Configuration* and set
`DB_SSL_CA` to its contents with `DB_SSL_REJECT_UNAUTHORIZED = true`.

### Use the right connection string — the pooler has two ports

Supabase offers three, and they are not interchangeable:

| Connection | Host / port | Use for migrations? |
|---|---|---|
| **Direct** | `db.<ref>.supabase.co:5432` | Yes, if your network has IPv6 |
| **Session pooler** | `aws-0-<region>.pooler.supabase.com:5432` | **Yes — the safe default** |
| **Transaction pooler** | `aws-0-<region>.pooler.supabase.com:6543` | **No** |

- **Transaction mode (6543) does not support prepared statements** or
  session-level state. Migrations issue DDL in a transaction and will behave
  badly or fail outright. Never point `migration:run` at port 6543.
- **The direct connection is IPv6-only** for projects created since early 2024.
  From a network or CI runner without IPv6 you get `ENETUNREACH`, which looks like
  a firewall problem and is not. The session pooler resolves on IPv4.
- The session pooler username is `postgres.<project-ref>`, not `postgres`.

If you use the transaction pooler for the *running app* — which is reasonable,
it is what serverless deployments want — still run migrations through session mode
or the direct connection.

### URL-encode the password

Supabase generates passwords containing characters that are meaningful in a URL.
`@`, `#`, `/`, `:` and `?` must be percent-encoded, or the connection string parses
into the wrong host. `p@ss#word` becomes `p%40ss%23word`.

### Worked example

```dotenv
DATABASE_URL = "postgresql://postgres.abcdefghijklm:p%40ss%23word@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
DB_SSL = true
DB_SSL_REJECT_UNAUTHORIZED = false
DB_SYNCHRONIZE = false
```

```bash
pnpm migration:show    # expect: [ ] InitialSchema...  (pending)
pnpm migration:run     # applies it
pnpm migration:show    # expect: [X] InitialSchema...  (applied)
```

Then confirm in the Supabase **Table Editor**: 16 tables plus `migrations`.
Supabase's own `auth`, `storage` and `realtime` schemas are untouched — everything
here lives in `public`.

---

## 7. Putting it on a server

### Render

1. **Create the PostgreSQL instance first.** Copy its *internal* connection
   string — the internal host avoids egress charges and is faster.
2. **Web Service** from the repo:
   - Build command: `pnpm install && pnpm build`
   - Start command: `pnpm start:prod`
   - Health check path: `/api`
3. Set the environment variables from §5, with `DB_SYNCHRONIZE=false`.
4. **Run the migration.** Two options:
   - A **pre-deploy command** of `pnpm migration:run:prod`, which Render runs
     after build and before the new instance takes traffic. This is the right
     answer.
   - Or once by hand from a shell against the external connection string.

   Do **not** run migrations from application startup. With more than one
   instance they race, and a failed migration takes down the process rather than
   failing a deploy you can roll back.
5. `bcrypt` compiles natively. If the build fails on it, confirm
   `pnpm.onlyBuiltDependencies` still lists `bcrypt` in `package.json`.

### AWS

The shape is the same, with more pieces:

| Piece | Service |
|---|---|
| Database | RDS for PostgreSQL, Multi-AZ once it matters |
| App | ECS Fargate behind an ALB, or App Runner for less wiring |
| Migration | A **one-off ECS task** running `pnpm migration:run:prod`, invoked by the pipeline before the service updates |
| Secrets | Secrets Manager or SSM Parameter Store, injected as env vars |
| Images | ECR |

Keep the database in private subnets and let only the app's security group reach
port 5432.

---

## 8. First-run data

The schema is empty after migrating. Two things are needed before the API is
usable, and neither can be done through the API itself:

**An impact factor** — donations compute meals and CO₂ from it, and without a row
those figures come back null:

```sql
INSERT INTO impact_factor (label, meals_per_kg, co2_kg_per_kg, effective_from)
VALUES ('default-2026', 2.5, 2.0, '2026-01-01');
```

**A first admin user** — `POST /api/users` is behind the global auth guard, so
there is no way to create the first account over HTTP. Insert one with a bcrypt
hash (cost 10):

```bash
node -e "import('bcrypt').then(b=>b.default.hash(process.argv[1],10)).then(console.log)" 'YourPassword'
```

```sql
INSERT INTO "user" (email, password_hash, role, is_active)
VALUES ('admin@spira.app', '<hash>', 'ADMIN', true);
```

Then sign in at `POST /api/auth/login` and create the rest through the API.

A seed script for both is worth writing before the pilot; it is listed under
production ops in `docs/cost-model.md` §5.1.

---

## 9. Checklist

- [ ] `pgcrypto` available on the target database
- [ ] `DATABASE_URL` set, password URL-encoded, **not** the transaction pooler (port 6543)
- [ ] `DB_SSL=true` (managed providers only; `?sslmode=` in the URL does nothing)
- [ ] `DB_SYNCHRONIZE=false`
- [ ] `ACCESS_TOKEN_SECRET` set to something long and random, not the `.env` default
- [ ] `CORS_ORIGIN` lists the real frontend origins
- [ ] `pnpm build` succeeds, and `dist/database/migrations/` contains the `.js`
- [ ] `pnpm migration:run:prod` applied, `migration:show:prod` shows `[X]`
- [ ] Impact factor row inserted
- [ ] First admin user inserted, and login returns a token
- [ ] Health check `GET /api` returns 200
- [ ] Automated backups on, and a restore actually tested
