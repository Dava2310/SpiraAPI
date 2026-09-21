# Spira — Cost Model

**Purpose:** answer "what does this software cost us per user?" for the MVP and the
two growth stages after it.

**Currency:** EUR. **Location:** Barcelona, Spain. **Priced:** September 2026.

> **A note on units.** Effort is measured in **person-months**: one person working
> for one month. At our blended rate (§2) one person-month costs **€7,600**, so a
> "4.0 person-month" task costs €30,400 whether it is one person for four months
> or four people for one.

> **Read this first.** "Cost per user" has two very different answers, and
> confusing them is the most common mistake in an early-stage cost model:
>
> - **Marginal cost per user** — what one more user adds to the bill. For Spira
>   that is **€0.89–€1.80 per seat per month**, and it falls as we grow.
> - **Fully-loaded cost per user** — total monthly burn divided by users. At MVP
>   scale that is **€551 per seat per month**, because we are paying two engineers
>   to serve fifty people.
>
> The first number says the product can be profitable. The second says we have a
> distribution problem, not a cost problem. Both are in §7.

---

## 1. What exists today

Measured from the repository, not estimated:

| | Count |
|---|---|
| Backend TypeScript files | 295 |
| Backend lines of code | 23,346 |
| Modules | 22 |
| HTTP endpoints | 121 |
| Database tables | 16 |
| Request/response DTOs | 89 |
| Entities | 18 |
| Design documentation | 1,937 lines across 4 documents |
| Frontend prototypes | 8,844 lines (retailer 3,084 + NGO 5,760) |

The backend is feature-complete against both frontend designs: authentication
with token revocation, role-based access control with per-organization scoping,
the full donation lifecycle in both directions, the surplus shelf with geographic
search, atomic claiming, pickup credentials with QR and PIN, custody certificates
with PDF and CSV export, and impact aggregates.

**The frontends are prototypes with no HTTP layer at all** — both are
localStorage-driven, and neither has a login screen that collects credentials.
Turning them into production apps is a phase of its own (§4), and is the single
largest remaining block of work.

---

## 2. Labour rates — Barcelona, 2026

Spanish employer social security is **~31% on top of gross salary** for a
permanent contract (23.60% common contingencies + 5.50% unemployment + 0.20%
FOGASA + 0.60% training + 0.75% MEI + ~1.5% accident cover), capped at a
contribution base of €5,101.20/month.

"Overhead" below is €500/month per head: laptop amortisation, coworking desk,
software seat, professional insurance and payroll administration.

| Role | Gross/year | +31% SS | Overhead | **Fully loaded/month** |
|---|---|---|---|---|
| Mid developer | €50,000 | €65,500 | €500 | **€5,960** |
| Senior developer | €70,000 | €91,700 | €500 | **€8,140** |
| Senior mobile developer | €70,000 | €91,700 | €500 | **€8,140** |
| Tech lead / CTO | €90,000 | €117,900 | €500 | **€10,325** |
| Support / customer success | €35,000 | €45,850 | €500 | **€4,320** |

**Blended rate: €7,600 per person-month**, from a CTO + senior + 2 mid squad.
Used throughout for build estimates.

Contractor alternative: €400–550/day in Barcelona for a senior, ≈ €9,450/month at
21 billable days. More expensive per month, no severance exposure, no ramp-up.
Worth it for the GDPR work and the design system; not for the core product.

---

## 3. Build cost — already built

| Work | Person-months | Conventional | Actual |
|---|---|---|---|
| Schema design, 2 iterations, 4 design documents | 1.0 | €7,600 | €1,140 |
| Backend: 121 endpoints, 16 tables, auth, RBAC, aggregates | 5.5 | €41,800 | €4,940 |
| Two frontend prototypes (no backend wiring) | 2.5 | €19,000 | €3,040 |
| AI development tooling | — | — | €200 |
| **Total built** | **9.0** | **€68,400** | **≈ €9,320** |

**Conventional** is what a funded team without AI assistance would spend — the
number for a replacement-cost valuation, and the honest answer to "what would it
cost a competitor to catch up?". **Actual** is what we spent.

Leverage on greenfield backend work has been roughly **7×**. It is *not* uniform
and must not be extrapolated: it is highest on schema, CRUD and documentation, and
close to 1× on design decisions, GDPR compliance and anything needing a
conversation with a customer. The phases below use lower, differentiated factors.

---

## 4. Build cost — frontend to production

The largest remaining block, and previously under-counted. The prototypes have no
HTTP client, no auth flow, no error or loading states, and five NGO screens whose
handlers exist with no entry point.

| Work | Person-months | Conventional | Actual (est.) |
|---|---|---|---|
| HTTP client layer: typed API client, token refresh, interceptors, retry | 0.75 | €5,700 | €2,280 |
| Login screens for both apps (neither collects credentials today) | 0.50 | €3,800 | €1,520 |
| Retailer app: replace all mock data, forms, validation, error and empty states | 2.00 | €15,200 | €7,600 |
| NGO app: same, plus map and geolocation, claim flow with 409 contention handling | 2.50 | €19,000 | €9,500 |
| The five orphaned NGO surfaces: entry points and wiring | 1.00 | €7,600 | €3,800 |
| Design system, responsive layouts, accessibility pass | 1.25 | €9,500 | €5,700 |
| Frontend test suite (component + Playwright end-to-end) | 1.00 | €7,600 | €3,040 |
| **Total frontend** | **9.00** | **€68,400** | **€33,440** |

Leverage here averages **2.0×**, well below the backend's 7×. UI work is mostly
visual judgement, device testing and iteration against a designer — none of which
compresses the way schema and CRUD do.

---

## 5. Build cost — platform, mobile and integrations

### 5.1 Backend and platform remaining

| Work | Person-months | Conventional | Actual (est.) |
|---|---|---|---|
| AI agent layer (§6) | 2.00 | €15,200 | €7,600 |
| Backend test suite + CI/CD pipeline | 1.50 | €11,400 | €3,800 |
| Production ops: IaC, monitoring, backups, staging, runbooks | 1.00 | €7,600 | €4,560 |
| Auth hardening: refresh tokens, password reset, email verification, rate limiting | 1.00 | €7,600 | €3,040 |
| Notification delivery (push + email; preferences already modelled) | 0.75 | €5,700 | €2,280 |
| Admin console for retailer/NGO verification workflow | 1.25 | €9,500 | €3,800 |
| GDPR: DPA, privacy policy, cookie consent, data export and erasure | 0.50 | €3,800 | €3,040 |
| Design, QA and product management overhead | 1.50 | €11,400 | €9,880 |
| **Subtotal** | **9.50** | **€72,200** | **€38,000** |

### 5.2 Mobile apps, driver app and ERP integrations

Counted in the build rather than parked, per the scope decision.

| Work | Person-months | Conventional | Actual (est.) |
|---|---|---|---|
| React Native apps, iOS + Android, shared codebase serving both sides | 5.00 | €38,000 | €19,000 |
| Driver experience: live location, routing to store, arrival push, offline queue, QR present | 3.00 | €22,800 | €11,400 |
| ERP / POS integrations × 2 (one chain POS + a generic SFTP/CSV fallback) | 4.00 | €30,400 | €15,200 |
| **Subtotal** | **12.00** | **€91,200** | **€45,600** |

Notes that matter for the number:

- **The driver app is a role inside the mobile codebase, not a third app.** Built
  separately it would be 5–6 person-months instead of 3; sharing the auth, API
  client and design system is most of the saving.
- **ERP integrations do not generalise.** Each retail chain has its own product
  master, stock feed and file format. Two are budgeted; **each additional chain is
  a further 2.0 person-months (€15,200)** and should be treated as a cost of sale,
  not a product cost.
- Leverage across this block is **2.0×** — native builds, device testing and
  real-world ERP file formats need iteration against actual systems.

### 5.3 Programme total

| Phase | Person-months | Conventional | Actual |
|---|---|---|---|
| Built (§3) | 9.0 | €68,400 | €9,320 |
| Frontend to production (§4) | 9.0 | €68,400 | €33,440 |
| Backend and platform remaining (§5.1) | 9.5 | €72,200 | €38,000 |
| Mobile, driver app, ERP (§5.2) | 12.0 | €91,200 | €45,600 |
| **Total programme** | **39.5** | **€300,200** | **€126,360** |

Of which **Phase 1 — a launchable web MVP** (§3 + §4 + §5.1) is **27.5
person-months = €209,000 conventional**, with mobile and integrations following.

Overall AI leverage across the whole programme is **2.5×**, not the 7× seen on the
backend alone — because two-thirds of the remaining work is frontend, mobile and
integration, where the factor is closer to 2×.

One-off company costs on top: SL incorporation via a Barcelona gestoría
€600–1,500, EUIPO trademark (one class) €850, domain €15/year.

**Amortisation used in §7:** €300,200 over 36 months = **€8,339/month.** If you
prefer to amortise only the web MVP and treat mobile as a later capital decision,
use €5,806/month. We amortise the conventional figure, not the actual spend,
because that is the asset's economic value.

---

## 6. Running costs

### 6.1 Scenarios

| | **Pilot** | **Launch** | **Scale** |
|---|---|---|---|
| Retailer branches | 10 | 100 | 1,000 |
| NGOs / foodbanks | 5 | 40 | 300 |
| Organizations (billable) | 15 | 140 | 1,300 |
| Named seats | 50 | 460 | 4,200 |
| Lots logged / month | 3,000 | 30,000 | 300,000 |
| Donations / month | 600 | 6,000 | 60,000 |
| Team headcount | 2 | 5 | 8 |

Seats assume 3 per retailer branch (manager + 2 staff) and 4 per NGO
(coordinator + 2 drivers + admin).

### 6.2 Product infrastructure

| Service | Purpose | Pilot | Launch | Scale |
|---|---|---|---|---|
| Application hosting | NestJS containers (Railway/Render → ECS Fargate) | €20 | €120 | €600 |
| Managed PostgreSQL | Neon Launch → Scale → HA + read replica | €20 | €90 | €320 |
| Object storage | Product photos, certificate PDFs (S3 / R2) | €2 | €15 | €90 |
| CDN + WAF | Cloudflare Free → Pro → Business | €0 | €20 | €200 |
| Redis | Cache, job queue for notifications and AI agents | €10 | €35 | €150 |
| Transactional email | Resend / SendGrid | €0 | €20 | €90 |
| Push notifications | FCM, plus volume tier at scale | €0 | €0 | €60 |
| Error tracking | Sentry, web + mobile | €0 | €32 | €100 |
| Uptime + APM | Better Stack / Grafana Cloud | €0 | €25 | €120 |
| Geocoding, tiles, routing | Nominatim → Mapbox (shelf radius + driver routing) | €0 | €50 | €250 |
| Driver location ingest | Write volume for live tracking | €0 | €20 | €120 |
| ERP integration runtime | SFTP endpoint, scheduled jobs, failure alerting | €0 | €15 | €80 |
| Mobile build pipeline | Expo EAS | €0 | €29 | €99 |
| App store fees | Apple €99/yr + Google one-off, amortised | €8 | €8 | €8 |
| Off-site backups | Postgres PITR beyond included retention | €0 | €15 | €60 |
| CI/CD | GitHub Actions minutes | €0 | €20 | €60 |
| Staging environment | ~30% of production app + database | €12 | €60 | €200 |
| Domain (.com + .es) | Amortised from €15/year | €1 | €1 | €1 |
| **Total** | | **€73** | **€575** | **€2,608** |
| *Rounded, used below* | | **€75** | **€575** | **€2,610** |

The database is the largest line at every scale and the one item that cannot
scale to zero: the surplus shelf is a geographic aggregate that must be warm
whenever a driver opens the app.

### 6.3 Company tooling

| Item | Basis | Pilot (2) | Launch (5) | Scale (8) |
|---|---|---|---|---|
| Per-seat SaaS (Workspace, Slack, Linear, Notion, GitHub, 1Password) | €42.50/seat | €85 | €213 | €340 |
| Figma | 2 editors | €30 | €30 | €30 |
| Gestoría (payroll, accounting, tax filings) | fixed | €200 | €200 | €200 |
| Legal + external DPO | fixed | €120 | €120 | €120 |
| Professional + cyber insurance | fixed | €80 | €80 | €80 |
| AI development tooling | fixed | €150 | €150 | €150 |
| **Total** | | **€665** | **€793** | **€920** |

---

## 7. The AI agent layer

Not yet implemented. Sized here because it is the only cost that scales linearly
with usage rather than in steps.

### 7.1 What the agents would do

| Agent | Job | Trigger | Model |
|---|---|---|---|
| **Lot Composer** | Reads a branch's unlisted stock — expiry, weight, category, cold-chain need — and proposes coherent donation lots, so staff approve a suggestion instead of ticking 40 checkboxes. Groups a crate of yoghurt with the bread expiring the same evening that fits one vehicle. | On demand + nightly per branch | Haiku 4.5 |
| **Matcher** | Ranks which recipients should see a lot: distance, vehicle capacity, freezer availability, their saved urgency threshold, historical acceptance rate, and a fairness term so large NGOs do not absorb everything. Explains the ranking in one sentence — a manager overriding a silent algorithm is how trust dies. | Per lot published | Haiku 4.5 |
| **Expiry Triage** | Replaces the retailer app's "AI Smart Expiry Detector", today an 800 ms fake spinner over a client-side filter. Classifies stock into act-now / today / this week and drafts the alert copy. | Hourly per branch | Haiku 4.5 |
| **Demand Forecaster** | Predicts which categories an NGO will need next week from pickup history and service area, so retailers list ahead of demand instead of dumping surplus and hoping. | Weekly per NGO | Haiku 4.5 |
| **Ops Copilot** | Natural-language questions over an organization's own data ("how much dairy did we rescue in September?"), and drafts the narrative around the impact figures for a grant report. | On demand | Sonnet 5 |

**The architectural constraint that determines the cost.** Ranking, scoring and
filtering are deterministic SQL — free, testable, self-explaining. The model is
used only for composition, explanation and language. Calling a model per inventory
row instead of per batch is the difference between €0.73 and €12.42 per branch per
month (§7.3). Driver routing uses Mapbox Directions, not a model.

### 7.2 Token pricing

List prices, converted at **USD 1 = EUR 0.92** (an assumption; revisit quarterly):

| Model | Input | Cached input | Output |
|---|---|---|---|
| Claude Haiku 4.5 | €0.92 / MTok | €0.09 / MTok | €4.60 / MTok |
| Claude Sonnet 5 | €1.84 / MTok | €0.18 / MTok | €9.20 / MTok |

Prompt caching matters: the system prompt, product catalogue and scoring rubric
are identical across calls, so most input bills at the cached rate. Batch
processing (50% off) applies to the nightly Composer and weekly Forecaster.

### 7.3 Cost per organization per month

**Per retailer branch** — 300 lots logged, 60 donations, 30 triage runs, 45 composer runs:

| Agent | Calls/mo | Tokens in / out | Cost/call | **Cost/mo** |
|---|---|---|---|---|
| Lot Composer | 45 | 4,000 / 800 | €0.0074 | €0.33 |
| Matcher | 60 | 2,500 / 400 | €0.0041 | €0.25 |
| Expiry Triage | 30 | 3,000 / 500 | €0.0050 | €0.15 |
| **Per branch** | | | | **€0.73** |

**Per NGO** — 200 shelf browses, 120 offers evaluated, 4 forecasts, 20 copilot queries:

| Agent | Calls/mo | Tokens in / out | Cost/call | **Cost/mo** |
|---|---|---|---|---|
| Ranked shelf explanation | 50 | 2,400 / 350 | €0.0040 | €0.20 |
| Demand Forecaster | 4 | 9,000 / 900 | €0.0125 | €0.05 |
| Ops Copilot (Sonnet 5) | 20 | 6,000 / 600 | €0.0165 | €0.33 |
| **Per NGO** | | | | **€0.58** |

**Rolled up, with a 25% buffer for retries, evaluation runs and experimentation:**

| | Pilot | Launch | Scale |
|---|---|---|---|
| Branches × €0.73 | €7 | €73 | €730 |
| NGOs × €0.58 | €3 | €23 | €174 |
| +25% buffer | €3 | €24 | €226 |
| **AI total / month** | **€15** | **€120** | **€1,130** |

**The finding worth internalising:** at our volumes AI inference costs less than
the staging environment. Under €1 per organization per month buys every agent
above. The risk is not token prices, it is an unbounded call pattern. Three
controls, cheap now and expensive to retrofit:

1. A per-organization monthly token budget, enforced server-side.
2. Batch-per-branch prompts, never per-row.
3. Prompt caching on by default, with a test that fails if the Composer's cache
   hit rate drops below 70%.

The counterfactual: Sonnet 5 once per inventory row, no caching, full catalogue in
context — 300 × (20,000 in + 500 out) = **€12.42 per branch per month**, a 17×
increase for a worse product.

---

## 8. Cost per user

### 8.1 Total monthly cost

| | Pilot | Launch | Scale |
|---|---|---|---|
| Product infrastructure (§6.2) | €75 | €575 | €2,610 |
| AI inference (§7) | €15 | €120 | €1,130 |
| Company tooling (§6.3) | €665 | €793 | €920 |
| People (§2) | €18,465 | €38,525 | €56,945 |
| Build amortisation, 36 mo (§5.3) | €8,339 | €8,339 | €8,339 |
| **Total monthly cost** | **€27,559** | **€48,352** | **€69,944** |

Team composition: Pilot = CTO + senior backend. Launch adds a senior mobile dev
and two mid developers. Scale adds a third mid, a senior SRE and a support hire.

People are **67%** of the bill at Pilot, **80%** at Launch and **81%** at Scale.
Infrastructure and AI together are **0.3% / 1.4% / 5.3%** — never above 6%. This
is a payroll business that happens to run some servers.

### 8.2 The unit economics

**Marginal cost** — infrastructure + AI only, what one more unit actually adds:

| Per… | Pilot | Launch | Scale |
|---|---|---|---|
| Named seat / month | €1.80 | €1.51 | **€0.89** |
| Organization / month | €6.00 | €4.96 | **€2.88** |
| Donation handled | €0.15 | €0.12 | **€0.06** |

**Fully-loaded cost** — total burn ÷ units, including people and amortised build:

| Per… | Pilot | Launch | Scale |
|---|---|---|---|
| Named seat / month | €551 | €105 | **€16.65** |
| Organization / month | €1,837 | €345 | **€53.80** |
| Donation handled | €45.93 | €8.06 | **€1.17** |

The gap between the two tables is the whole story. Marginal cost per seat is under
€2 and falls 51% from Pilot to Scale. Fully-loaded cost per seat falls **97%** —
not because the software gets cheaper, but because a fixed team is spread over 84×
more seats.

---

## 9. Still parked

Deliberately **not** costed, and why:

| Item | Indicative cost | Why parked |
|---|---|---|
| Multi-country: i18n, tax rules, jurisdiction-specific certificates | €20,000–30,000 + €200/mo | Spain-only until the Spanish market is proven |
| Payments through the platform | €8,000 + 1.5% & €0.25/txn | We are not in the money flow; donations are free by design |
| SOC 2 / ISO 27001 | €30,000–50,000 + €1,000/mo | Triggered by the first enterprise retailer that demands it, not before |

Also excluded because they are real costs but not *software* costs: customer
acquisition, sales and marketing (for a two-sided marketplace this will exceed
the entire engineering budget and is what actually determines whether the company
works), founder equity and option pool, office beyond a coworking desk, corporate
tax, and runway itself.

**Cost offsets available in Spain** — material against a €300,200 build, and worth
modelling properly before the next raise:

- **Ley de Startups** ("empresa emergente"): corporate tax at 15% for up to 4
  years, social security deferral for founders, relaxed stock-option treatment.
- **R&D deduction** (*deducción por I+D+i*): 25–42% of qualifying development
  spend, creditable against corporate tax and monetisable while loss-making. On
  this programme plausibly **€60,000–110,000**.
- **ENISA** participative loans; **CDTI Neotec** grants to €250,000; **Barcelona
  Activa** programmes; **ACCIÓ** (Generalitat de Catalunya) innovation vouchers.
- The **Beckham Law** (24% flat income tax) changes net pay for any senior hire
  relocating, which affects what gross offer clears.

---

## 10. What this means commercially

At Launch scale we burn **€48,352/month**. Against a price of **€99 per retailer
branch per month** with NGOs free — the shape the product implies, since NGOs are
the supply-constrained side and charging them is self-defeating:

| Price per branch/month | Branches to break even |
|---|---|
| €79 | 612 |
| €99 | 488 |
| €149 | 325 |
| €199 | 243 |

At Scale (1,000 branches) and €99, revenue is €99,000/month against €69,944 of
cost: a **29% operating margin** with a team of eight, before any sales spend.

Three conclusions:

1. **The software is cheap to run and expensive to build.** Marginal cost per seat
   is €0.89–€1.80. Nothing in infrastructure or AI threatens the business at any
   scale modelled here.
2. **Break-even is a distribution problem.** We need roughly 325–490 retailer
   branches — a small number of supermarket chains and a large number of
   conversations. Cost engineering will not move this; enterprise sales will. Note
   that adding mobile, the driver app and ERP integrations pushed break-even from
   ~366 branches to ~488 at €99, and the operating margin at Scale from 36% to
   29%. That is the price of those three features, stated plainly.
3. **Guard the AI call pattern now.** It is the only linear cost, currently
   negligible, and the gap between a designed and a naive implementation is 17×.
   Budget enforcement and batch prompting are a day of work today.

---

## 11. Assumptions and confidence

| Assumption | Confidence | Note |
|---|---|---|
| Employer SS at 31% | **High** | Order PJC/297/2026, General Regime, permanent contract |
| Claude API list prices | **High** | Verified September 2026; Sonnet 5 at $2/$10 now permanent |
| Managed Postgres pricing | **Medium-high** | Third-party comparisons; verify against provider pages before committing |
| Barcelona salary bands | **Medium** | Aggregators disagree by up to 35% at mid level; bands chosen toward the local-company end, not big tech |
| USD→EUR at 0.92 | **Medium** | Revisit quarterly; a 10% FX move shifts the AI line by €113/month at Scale |
| Built effort (9.0 person-months conventional) | **Medium** | Derived from 121 endpoints, 16 tables and observed scope; ±30% |
| Frontend effort (9.0 person-months) | **Medium-low** | No production frontend exists yet to calibrate against; the single largest uncertainty in the build number |
| Mobile + driver app (8.0 person-months) | **Low** | Assumes one shared React Native codebase. Separate apps would be 5–6 person-months more |
| ERP integration at 2.0 person-months each | **Low** | Entirely dependent on the chain's systems; could be half or triple |
| Activity per branch (300 lots, 60 donations/mo) | **Low** | Modelled, not observed. The pilot exists to replace this with real data |
| Seats per organization (3 retail, 4 NGO) | **Low** | The single biggest lever on every per-seat figure in §8 |

The low-confidence rows cluster in two places: **usage** (answered by the pilot,
not by more analysis) and **integration scope** (answered by the first chain's
technical call). Everything downstream should be re-run once ten real branches
have logged a month of stock.

---

## Sources

- [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Seguridad Social — contribution rates](https://www.seg-social.es/) · [BOE Order PJC/297/2026](https://www.boe.es/)
- [Managed Postgres pricing comparison 2026](https://www.techplained.com/best-managed-postgres) · [Bytebase hosting comparison](https://www.bytebase.com/blog/postgres-hosting-options-pricing-comparison/) · [AWS RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- Barcelona salary bands cross-referenced across CompVerdict, SalaryVerdict, SkillTa and EuroTopTech; see §11.
