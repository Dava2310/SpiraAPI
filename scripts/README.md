# Scripts

## Tenant isolation probe

Checks that one organization cannot read or write another's data. Run it against a
**throwaway** database — it registers accounts and writes records.

```bash
# 1. a fresh database and the built app
docker exec spira-db psql -U spira -d postgres -c 'DROP DATABASE IF EXISTS spira_sec' -c 'CREATE DATABASE spira_sec'
pnpm run build
DATABASE_URL="postgresql://spira:spira_secret@localhost:5433/spira_sec" DB_SSL=false \
  ACCESS_TOKEN_SECRET=probe REFRESH_TOKEN_SECRET=probe \
  node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
PORT=3399 DATABASE_URL="postgresql://spira:spira_secret@localhost:5433/spira_sec" DB_SSL=false \
  CORS_ORIGIN='*' ACCESS_TOKEN_SECRET=probe REFRESH_TOKEN_SECRET=probe node dist/main.js &

# 2. two retailers, two recipients, a donation carried to a certificate
bash scripts/tenant-isolation-seed.sh

# 3. cross-tenant reads must all print `ok`
bash scripts/tenant-isolation-probe.sh

# 4. and each organization's own reads must all print `ok`
bash scripts/tenant-isolation-positive.sh
```

Two lines in step 3 are known needle artifacts rather than leaks:
`location-pickup-slots/by-location` matches on `[` and returns `[]`, and the
`inventory-items` line matches a product name that also belongs to a *listed* lot,
which a recipient is meant to see. Confirm by checking that the unlisted lot's id
404s and that its retail value never appears.
