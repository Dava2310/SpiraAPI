# Spira — Frontend Integration Plan

Everything the API must expose for **both** frontends to work as they are currently designed, and every schema change that requires. Derived from a full read of the two exported apps, reconciled column-by-column against the v2 schema.

> **Status:** decisions taken, implementation in progress. See [Decisions](#0-decisions-taken). Supersedes nothing — [`database-schema-v2.md`](./database-schema-v2.md) remains the description of what is built today; this document is the delta to reach the frontends.

| Source | Lines | Verdict |
|---|---|---|
| `~/Spira/Spira-Retailer-Portal` | 3,041 | A **UI restyle** of the app we already modelled. One new feature, no new entity. |
| `~/Spira/NGO-spira` | 5,727 | **New side of the product.** Inverts the direction of the donation flow. |

---

## 0. Decisions taken

| # | Question | Decision |
|---|---|---|
| 1 | Flow direction | **`donation.origin` enum** (`RETAILER_OFFER` \| `RECIPIENT_CLAIM`) + `inventory_item.is_listed`. One transaction table. A claim jumps straight to `READY_FOR_PICKUP`. |
| 2 | Who confirms a handover | **Retailer only.** `confirmed_by_user_id` stays the certificate's authorising signatory; the NGO's self-confirm button is demo scaffolding and gets no endpoint. |
| 3 | Shelf visibility | **Open pool within radius.** Any `ACTIVE` verified recipient in range sees listed stock; partnership becomes a preference signal, not a gate. The claim service's partnership check is relaxed. |
| 4 | Impact factors | **2.5 meals/kg, 2.0 kg CO₂/kg** — the retailer app's set. Seeded as one `impact_factor` row; `donation_receipt.impact_factor_id` pins it per certificate. |
| 5 | Currency | **EUR as the single platform currency.** Per-row `currency` columns are kept but default to `'EUR'`; the retailer UI changes its `$`/`en-US` formatting to `€`. |
| 6 | Expiry thresholds | **Server defaults, overridable per request.** `withinDays` / `maxHoursLeft` as query params; urgency buckets (critical < 12h, expiring < 24h) as application constants. No settings table. |
| 7 | Standby Emergency Pass | **Column and verification-pass endpoint now, reverse flow deferred.** `recipient.registration_code` is needed regardless (it renders as "Organization ID"). |
| 8 | Handover PIN | **6-digit numeric**, unique among unconsumed unexpired tokens, generate-and-retry. Distinct from `pickup_token.code`, which stays the machine/QR payload. |

Smaller calls made while implementing:

- `inventory_item.expiry_date` is **replaced** by `expires_at timestamptz`, not kept alongside it — two sources of expiry is what produced the stale `daysRemaining` in the first place.
- `donation.scheduled_pickup_at` is **replaced** by `pickup_window_start` / `pickup_window_end`.
- `inventory_item.reason` **stays `NOT NULL`**: despite the modal being relabelled to "Add New Products to Inventory", the form still carries a Condition/Reason select defaulting to `near_expiry`.
- `DRIVER_EN_ROUTE` **stays** in `donation_status` (the endpoint exists); no new UI is built for it.
- `distanceKm` is **haversine**, computed per request, never stored.
- Onward distribution (beneficiaries, meal services) remains **out of scope** — see question 5 in §7.

---

## 0b. Implementation status

Everything in §4 and §5 is implemented, verified against a throwaway Postgres by
driving the built `dist/` with 131 end-to-end assertions (all passing). 121
routes are mapped; `swagger.json` carries 77 paths, 121 operations, 116 schemas.

**Beyond the plan as written, and why:**

| Addition | Why |
|---|---|
| `donation.pickup_slot_id` | §4.8 exists so a reservation round-trips; without the link it cannot. |
| `donation_receipt.handover_pin` | N17 requires the certificate to print the PIN, and the certificate must stay readable after the token is spent. |
| `RolesGuard` + `@Roles()` + `resolveScope`/`assert*Scope` | The §5.1 prerequisite. Registered globally after `AuthGuard`; ADMIN passes every check. |
| Cursor pagination (`PaginationQueryDto`, `PageMetaDto`) | Every list is bounded by default, since both apps fetched unbounded lists and reduced them client-side. |
| `pdfkit` dependency | R15 and N18 need a real file; `Download` was wired to nothing in both apps. |
| Shared `expiryView`, `haversineKm`, `resolvePeriod` | The three derivations the plan insists are never stored, each in one place. |
| `initials` from first **and last** word | First-two-words turned "Banc dels Aliments" into "BD". |

**Deliberately still open:** the `GET /me` response does not carry
`charityPartnersCount` (N2) — it is derivable from `/recipients/me/partner-locations`
and adding a second aggregate to the sign-in path was not worth the latency.
`DRIVER_EN_ROUTE` remains in `donation_status` with a transition route but no UI
in either app, as recorded in §7.

---

## 1. The headline

**The retailer app needs no schema change.** Verified by md5 across the whole tree: `App.tsx`, `package.json`, `BottomNav`, `QRScannerModal`, `ReceiptModal` and `NgoPreviewModal` are **byte-identical** to the version we already modelled. The entire data delta is:

```diff
  // types.ts — interface NGOInfo
    address: string;
+   logoUrl?: string;
+   imageUrl?: string;
```

plus one `imageUrl` value per NGO in the seed data. `logoUrl` is never referenced anywhere; `imageUrl` is consumed in exactly one place (`ProfileTab.tsx:128`). Since `recipient.logo_url` already exists, **that maps onto the existing column and we add nothing.** The one new feature — an "AI Smart Expiry Detector" — is a client-side filter (`daysRemaining <= 2 || reason === 'near_expiry'`) needing only a query endpoint.

**The NGO app is where the work is,** and its central fact is structural, not a missing column:

> The NGO **browses an open surplus shelf and claims items itself.** There is no offer inbox, no accept button and no decline button anywhere in 5,727 lines. `reserveItems()` creates the record already at `'Ready for pickup'`.

Our `donation` models the opposite — retailer drafts, offers, recipient accepts — with `recipient_id NOT NULL` at creation. That forecloses a shared pool. **This is the one decision that has to be made before any of the rest is worth building** (§3).

---

## 2. What each app actually does

Neither app exercises the negotiation we built. They implement two *different* creation paths that converge on the same handover.

```
RETAILER APP                                  NGO APP
────────────                                  ───────
log stock ──▶ IN_INVENTORY                    browse open shelf ("Find Food")
     │                                              │
     ▼ "Donate" / "Transfer" / "Add All"             ▼ "Reserve Package" / one-tap AI claim
  queue ──▶ RESERVED                          claim ──▶ reservation @ READY_FOR_PICKUP
  (NGO auto-assigned = first partner)          (PIN + QR minted immediately)
     │                                              │
     └──────────────▶ handover ◀────────────────────┘
            retailer scans / keys the NGO's code
                         │
                         ▼
                 DELIVERED + certificate
```

Both apps are localStorage-only. Neither has an HTTP client — **no `fetch`, no `axios`, no base URL** in either tree. The entire data layer is greenfield on the frontend side too.

### Screens and their status

| App | Screen | Routed? | Notes |
|---|---|---|---|
| Retailer | Home, Inventory, Donations, Profile | yes | 4 tabs |
| Retailer | `NgoPreviewModal` (driver QR pass) | **unreachable** | Both entry points deleted. The driver pass has moved to the NGO app. |
| NGO | Home, Find Food, Map, My Stats | yes | 4 tabs |
| NGO | `NgoReservationsScreen` (520 l), `NgoHistoryScreen` (239 l) | **unreachable** | Absorbed into Home and My Stats. Still the richest *data* spec we have. |
| NGO | `StoreDetailModal`, Edit Organisation, Manage Delegates | **unreachable** | Handlers fully written, no entry point. |
| NGO | `LoginScreen` | **unreachable** | Collects no credentials — one button calling `setRole('ngo')`. |

Five orphaned surfaces with complete handlers. I have specced their endpoints because the frontend clearly intends them, but **they are not currently reachable**, so they are marked `[orphan]` and should not block a first release.

---

## 3. Decision 1 — the direction of the flow

Everything else depends on this.

| | Option | Consequence |
|---|---|---|
| **A** | **Add a claim path.** `donation.origin` enum (`RETAILER_OFFER` \| `RECIPIENT_CLAIM`). A claim is created by a recipient-side user and lands straight in `READY_FOR_PICKUP`, leaving `offered_at` / `accepted_at` / `accepted_by_user_id` null. `OFFERED`, `ACCEPTED`, `DECLINED` stay in the enum for a future retailer-offer feature neither app has yet. | Smallest change. One table, one enum, one new creation endpoint. Both apps work. |
| **B** | **Separate `reservation` entity** that promotes to a `donation` on handover. | Cleaner conceptually; two tables to keep in step, and the receipt has to reach across both. |
| **C** | **Keep push-only** and rewrite the NGO app to consume an offer inbox. | No schema change; contradicts a 5,727-line app that has no inbox. |

**Recommendation: A.** It is additive, it keeps one transaction table, and it matches what both apps do today. The rest of this document assumes A.

Two things A forces:

- **`donation.created_by_user_id` widens.** Its doc comment says *"A retailer-side user"*. Under A it can be either side, which is what `origin` disambiguates.
- **The open shelf needs a state.** Stock must be visible to every eligible NGO *before* any donation exists. `inventory_item.status = IN_INVENTORY` currently means both "logged" and "claimable", and there is no eligibility scoping. See §4.1.

---

## 4. Schema changes

### 4.1 `inventory_item`

| Column | Change | Why |
|---|---|---|
| `expires_at timestamptz` | **add**, replacing `expiry_date` | **Blocking.** Urgency is driven by `'Today, 23:59'` vs `'Today, 20:00'` — 4h vs 7h left. A `date` cannot express that, and hours-left is the entire NGO prioritisation model. |
| `unit_price numeric(10,2)` | **add**, nullable | NGO shows `€1.25` per unit alongside the line total. Verified `totalValue === quantity * unitPrice` in all 16 mock items. |
| `unit_label varchar(20)` | **add**, nullable | 11 free-text units observed (`bottles`, `loaves`, `baguettes`, `tubs`, `trays`, `cartons`, `blocks`, `bags`, `packs`, `boxes`, `packages`) against our 5-member enum. Keep the enum canonical for maths; carry the label for display. |
| `image_url varchar(500)` | **add**, nullable | The retailer picks a photo **per logged item** from presets; `product.image_url` is the catalogue default. Item overrides catalogue. |
| `is_listed boolean` | **add**, default `false` | The open shelf (§3). `listed_at` exists but nothing distinguishes "logged" from "offered to the pool". |

`days_remaining` and `expiry_hours_left` are **derived, never stored** — both apps store them and both are already wrong in their own seed data (`daysRemaining: 1` hardcoded on create; `expiryHoursLeft` frozen in localStorage).

### 4.2 `location`

| Column | Change | Why |
|---|---|---|
| `neighborhood varchar(120)` | **add** | `'Eixample / Centro'`, `'Poblenou'`. Displayed *and* searchable. `city`/`state` are too coarse. |
| `store_format varchar(80)` | **add** | `'Supermarket Cooperative'`, `'Organic Grocery & Fresh Market'` — per-branch prose that neither `retailer.business_type` nor `location.type` can hold. |
| `access_instructions text` | **add** | Loading-bay gate, buzzer number, security window. Currently hardcoded prose in two different components. |

`pickup_hours_label` (`'16:00 - 20:30'`) is **derived** from `pickup_windows` + `timezone`, not stored.

### 4.3 `contact`

| Column | Change | Why |
|---|---|---|
| `location_id uuid` | **add**, nullable, FK `SET NULL` | A store manager is per-branch; `contact` only attaches to a retailer or recipient. Both apps print the manager on the handover screen. |

### 4.4 `recipient`

| Column | Change | Why |
|---|---|---|
| `registration_code varchar(40)` | **add**, unique | `'REG-NGO-2024-8842'`. A public platform registry id, distinct from `tax_id`. Displayed as "Organization ID" **and used as a permanent QR payload** (§3 of the standby flow). |
| `service_area varchar(120)` | **add** | `'Metropolitan Barcelona'`. Free text, user-editable. |
| `timezone varchar(50)` | **add**, default `'Europe/Madrid'` | The reservation list groups by "Today" vs "Upcoming". Without the recipient's timezone the server cannot resolve that. |
| `alert_radius_km numeric(4,1)` | **add**, default `5.0` | Notification preference, editable (slider 1–20). |
| `urgency_threshold` | **add** enum, default `ALL` | `ALL` \| `CRITICAL_EXPIRING` \| `CRITICAL_ONLY`. |
| `push_notifications_enabled boolean` | **add**, default `true` | |

> The three preference columns could be a `recipient_notification_preference` table instead. I'd put them on `recipient` for now — there is exactly one set per organisation and no per-user variation in the UI. Revisit if delegates ever get their own preferences.

`initials` is **derived** from the name, not stored.

### 4.5 `donation`

| Column | Change | Why |
|---|---|---|
| `origin` | **add** enum, not null | `RETAILER_OFFER` \| `RECIPIENT_CLAIM`. Decision 1. |
| `pickup_window_start timestamptz` | **add** | Every NGO surface shows a *range* (`'Today, 18:30 - 20:00'`) and the primary list grouping depends on it. |
| `pickup_window_end timestamptz` | **add** | |
| `estimated_meals numeric(12,2)` | **add**, nullable | Shown on an **open, pre-delivery** reservation and even pre-claim on an unsaved selection. Today it lives only on the immutable receipt. |
| `co2_avoided_kg numeric(12,3)` | **add**, nullable | Same. |
| `impact_factor_id uuid` | **add**, nullable, FK | Pin the factor at claim time so the pre-delivery figure and the certificate agree. |
| `total_quantity numeric(12,3)` | **add**, default `0` | The receipt's "(28 items)" is a **sum of quantities**; `line_count` is lines. Both are needed. |
| `cancellation_reason_code` | **add** enum, nullable | Closed picklist in the UI (§6). Free text alone cannot power analytics. |
| `cancelled_by_user_id uuid` | **add**, nullable, FK `SET NULL` | An NGO courtesy release and a retailer cancelling a no-show are different events. |

`scheduled_pickup_at` is dropped: the window pair replaces it.

Also added, not in the original list: `pickup_slot_id uuid` nullable, FK `SET NULL` to §4.8. Without it a claim against a named slot cannot round-trip, which is the whole reason that table exists.

### 4.6 `donation_line`

| Column | Change | Why |
|---|---|---|
| `expires_at timestamptz` | **add**, nullable | Snapshot. The NGO's whole prioritisation UX reads expiry off the line. |
| `unit_price numeric(10,2)` | **add**, nullable | Snapshot. |
| `unit_label varchar(20)` | **add**, nullable | Snapshot. |
| `image_url varchar(500)` | **add**, nullable | Rendered in the retailer's batch list and home urgency card. |

### 4.7 `pickup_token`

| Column | Change | Why |
|---|---|---|
| `pin varchar(8)` | **add**, not null | The UI shows a **human-keyable PIN** in large monospace with a copy button, *and* a QR. Our `code varchar(60)` is the machine payload; the PIN is what a cashier types. The retailer's scanner has a manual-entry field, so both paths are real. |

Also: the consumed PIN must stay **readable forever** — the receipt prints it. And `expires_at` must cover the whole pickup window; the NGO UI has no "pass expired" state and no reissue affordance.

The PIN is unique among **unconsumed** tokens (partial unique index), so a keyed-in PIN resolves to exactly one donation while a spent PIN can be reissued later.

### 4.7b `donation_receipt`

| Column | Change | Why |
|---|---|---|
| `total_quantity numeric(12,3)` | **add**, default `0` | The certificate prints "(28 items)" — a sum of quantities, not a line count. |
| `received_by_label varchar(150)` | **add**, nullable | Who signed on the receiving side. The driver need not be a platform user, so this cannot be a FK. |
| `estimated_meals` | **widen** `integer` → `numeric(12,2)` | A 2.5 meals/kg factor does not yield whole meals, and the certificate must agree with the figure `donation` carried. |

### 4.8 New table — `location_pickup_slot`

The claim flow offers **three fixed pickup windows** from a hardcoded array, and the two entry points disagree on the third. Reserving against a free string cannot round-trip.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `location_id` | `uuid` | FK `CASCADE` |
| `label` | `varchar(60)` | `'Evening'`, `'Store Close'`, `'Morning'` |
| `weekday` | `smallint` | 1–7 ISO, or null for "every day" |
| `start_time` | `time` | |
| `end_time` | `time` | |
| `is_active` | `boolean` | |

Soft-deletable like the other owned tables, so retiring a slot does not orphan the donations that reserved against it. `CHECK` constraints enforce `weekday BETWEEN 1 AND 7` and `end_time > start_time`.

### 4.9 Enums

| Enum | Change |
|---|---|
| `product_category` | **add `DELI`, `PREPARED`** — both in live NGO data with nowhere to go. `PANTRY`/`MEAT`/`BABY_CARE` stay but are unused NGO-side. |
| `unit_of_measure` | unchanged (5 canonical members) — display handled by `unit_label` |
| `donation_origin` | **new**: `RETAILER_OFFER`, `RECIPIENT_CLAIM` |
| `surplus_urgency` | **new**: `CRITICAL`, `EXPIRING`, `STANDARD` — computed, never stored; returned on every listing |
| `urgency_threshold` | **new**: `ALL`, `CRITICAL_EXPIRING`, `CRITICAL_ONLY` |
| `cancellation_reason_code` | **new**: `CANNOT_MAKE_WINDOW`, `VEHICLE_BREAKDOWN`, `VEHICLE_CAPACITY_REACHED`, `STORAGE_CAPACITY_REACHED`, `STORE_LOGISTICS_DELAY`, `NO_LONGER_NEEDED`, `DRIVER_NO_SHOW`, `OTHER` |
| `donation_status` | unchanged, but see §7 — `DRIVER_EN_ROUTE` has **no UI in either app** |

### 4.10 Do not model

Fields that exist in the frontends and must **not** become columns:

`mapX` / `mapY` (0–100 canvas coords, superseded by Leaflet, zero usages) · `distanceKm` (per-viewer, computed) · `expiryHoursLeft`, `daysRemaining` (derived) · `initials` (derived) · `itemsSummary` (a rendered string) · `imageIcon` (never populated) · `charityPartnersCount`, `memberSince` (derived) · `InventoryItem.deliveredAt` / `receiptNumber` (declared, never written or read in either version) · `NGOInfo.logoUrl` (unused; `imageUrl` → existing `recipient.logo_url`) · `reasonLabels` / `categoryLabels` (Tailwind class names — presentation) · `reservedAt: 'Just now'`, `pickupWindow` as prose, `date` as `'Yesterday, 19:15'` (all display formatting).

---

## 5. Endpoints

Every user action in both apps, as a concrete contract. `[orphan]` marks a surface whose UI is currently unreachable. `[exists]` marks a route already built.

### 5.1 Auth — both apps

Neither app has a login screen that collects credentials. Our Bearer flow works; the **frontends must be built to use it.**

| Method | Path | Notes |
|---|---|---|
| `POST` | `/auth/login` | `[exists]`. Response must additionally carry the caller's organisation so the app can bootstrap: `retailer` + primary `location` for a RETAILER, or `recipient` for a RECIPIENT. |
| `POST` | `/auth/logout` | `[exists]` |
| `PATCH` | `/auth/change-password` | `[exists]` |
| `GET` | `/me` | **new** — the context both apps assume implicitly. Returns user + role + organisation + primary location + impact counters. |

**Org-scoping is now mandatory, not optional.** Both apps assume every list is already scoped to "my organisation" and pass no owner id. With two roles live, a RECIPIENT must not read another recipient's reservations. This is the `@Roles()` work already flagged in v2 — it is now load-bearing.

### 5.2 Retailer app

| # | Screen / action | Method | Path | Request → Response |
|---|---|---|---|---|
| R1 | App bootstrap, Profile | `GET` | `/me` | → branch context: `chain`, `branchName`, `branchCode`, `address`, `operatingHours`, `managerName`, `isVerified` |
| R2 | Home dashboard | `GET` | `/retailer/dashboard` | → `{ ready: {lineCount, totalWeightKg, estimatedMeals}, nextPickup: {donationId, ngoName, contactPerson, vehiclePlate, etaLabel, scheduledAt} \| null, urgentCount, deliveredCount }` |
| R3 | Home urgent card | `GET` | `/inventory-items?status=IN_INVENTORY&expiringWithinDays=1&limit=3&sort=expiresAt:asc` | → items + `total` |
| R4 | Inventory list | `GET` | `/inventory-items?status=&q=&category=&reason=&limit=&cursor=` | `q` searches name **or** brand **or** barcode, all infix |
| R5 | Inventory facet chips | `GET` | `/inventory-items/facets?status=IN_INVENTORY` | → `{ total, byCategory: {…all 7 keys, zeros included…} }`. **Counts ignore the active search/reason filter** — must be a separate call. |
| R6 | AI expiry panel | `GET` | `/inventory-items/expiring?withinDays=2&includeReason=NEAR_EXPIRY` | An **OR** across two dimensions — not two ANDed params. `withinDays` is parameterised because Home uses 1 and Inventory uses 2. |
| R7 | Log a product | `POST` | `/inventory-items` | `{ name, brand, category, quantity, unit, unitLabel?, retailValue, currency, expiresAt, reason, reasonDescription, imageUrl, weightKg, directToDonation }` → item. Server upserts the `product` by barcode; **server generates the barcode** if absent (the client invents a random one). |
| R8 | Donate / Transfer / Add All | `POST` | `/donations/current/lines` | `{ inventoryItemIds: string[], recipientId? }` → the open donation. Creates it if none. **Server picks the recipient** when omitted — the client silently defaults to the first partner. Bulk and atomic. |
| R9 | Return to inventory | `DELETE` | `/donations/{id}/lines/{lineId}` | `[exists]`. Must also clear the item's intended recipient — the client leaks a stale NGO here. |
| R10 | Donations "Ready" tab | `GET` | `/donations/current` | → donation + lines with `imageUrl`, `reasonDescription`, `expiresAt`, `daysRemaining` |
| R11 | Verify scanned/keyed code | `POST` | `/pickup-tokens/verify` | `{ code }` → `{ valid, message?, donationId, recipient{name, shortName, badge, contactPerson, phone, vehiclePlate, imageUrl}, summary{lineCount, totalWeightKg, estimatedMeals, totalRetailValue, currency} }`. Must resolve the code to an organisation — today any 4+ char string passes and the NGO is read off the first item. |
| R12 | Confirm handover | `POST` | `/donations/{id}/confirm` | `[exists]`. **Must be idempotent** — the client fires it inside a `setTimeout` with no in-flight guard. Returns the receipt inline. |
| R13 | Delivered tab / recent receipts | `GET` | `/donations?status=DELIVERED&limit=&cursor=&sort=completedAt:desc` | `[exists]` needs the params |
| R14 | Open receipt | `GET` | `/donation-receipts/{id}` | `[exists]` |
| R15 | Download PDF | `GET` | `/donation-receipts/{id}/pdf` | **new.** The button exists and currently just closes the modal. |
| R16 | Profile impact card | `GET` | `/retailer/locations/{id}/impact?period=2026` | → the 5 counters, **period-scoped**. The UI says "2026 Annual Report" over all-time totals. |
| R17 | Profile partner list | `GET` | `/retailer/locations/{id}/partners` | → recipients with `imageUrl`, `badge`, `contactPerson`, `vehiclePlate`. Today it renders *all* NGOs unconditionally. |

### 5.3 NGO app — discovery

| # | Screen / action | Method | Path | Notes |
|---|---|---|---|---|
| N1 | Map + Find Food list | `GET` | `/recipients/me/surplus-packages?lat=&lng=&radiusKm=&q=&category=&urgency=&locationId=&sort=distance&limit=&cursor=` | **The single most important new endpoint.** Returns stock grouped by store, each row carrying the **availability summary** the markers need: `availableCount`, `highestUrgency`, `categories[]`, `categorySummary`, `totalWeightKg`, `totalValue`, `estimatedMeals`, `earliestExpiryHoursLeft`, plus `distanceKm`, `lat`, `lng`, `neighborhood`, `pickupHoursToday`, `phone`, `isVerified`. Must be an aggregate, not N+1. `meta` carries **both** `totalPackages` and `filteredPackages` — the UI's count badge ignores the filters. |
| N2 | Store detail | `GET` | `/locations/{id}` | `[orphan]` → all of N1's fields for one store + `accessInstructions`, `managerName`, `storeFormat`, `memberSince`, `charityPartnersCount` |
| N3 | Store's available lines | `GET` | `/inventory-items?locationId=&status=IN_INVENTORY&isListed=true` | Each line: `name`, `category`, `quantity`, `unit`, `unitLabel`, `weightKg`, `unitPrice`, `retailValue`, `currency`, `expiresAt`, `expiryHoursLeft`, `urgency` |
| N4 | Pickup slot options | `GET` | `/locations/{id}/pickup-slots` | Replaces the three hardcoded strings |
| N5 | Urgent alerts | `GET` | `/recipients/me/alerts/urgent?radiusKm=&urgencyThreshold=&maxHoursLeft=` | The "AI" panel. **Implement as a rule engine, not an LLM** — see §7. Server applies the recipient's saved preferences, which the client currently ignores entirely. |
| N6 | "Scan Shelves" refresh | `GET` | N5 again | The button is an 800 ms fake spinner; a revalidate is the honest implementation. |

### 5.4 NGO app — reservations

| # | Action | Method | Path | Notes |
|---|---|---|---|---|
| N7 | **Claim** (3 entry points) | `POST` | `/recipients/me/reservations` | `{ locationId, inventoryItemIds[], pickupSlotId \| {start,end}, source?: BROWSE\|PACKAGE\|AI_RESCUE, driverContactId? }` → full reservation **including `pickupToken.pin`** (the success toast prints it immediately). **`409`** with `{ unavailableItemIds[] }` on contention — must be an atomic `SELECT … FOR UPDATE`; the client's availability check is optimistic and racy. |
| N8 | Reservation list | `GET` | `/recipients/me/reservations?status=&window=today\|upcoming&sort=&limit=` | `window` must be a **server-side predicate in the recipient's timezone**. The client greps the prose (`pickupWindow.includes('today')`), which puts `'⚡ Instant AI Rescue Window'` in the wrong bucket. |
| N9 | Active pass count | `GET` | `/recipients/me/reservations/counts` | → `{ active, today, upcoming }`. **Define "active" once** — the nav uses `Reserved + Ready for pickup`, the header uses `!== Cancelled` (so delivered passes stay "active" forever). |
| N10 | One reservation | `GET` | `/recipients/me/reservations/{id}` | with lines and token |
| N11 | Show QR + PIN | `GET` | `/donations/{id}/pickup-token` | **new** — fetch the *current* token. Only `POST` exists, which would mint a fresh code every time the modal opens. |
| N12 | Reissue an expired pass | `POST` | `/donations/{id}/pickup-token` | `[exists]` |
| N13 | Cancel / "Release Package" | `PATCH` | `/donations/{id}/cancel` | `[exists]` but the DTO takes only free text. Needs `{ cancellationReasonCode, cancellationReason? }`, recipient-authenticated, and must **release every reserved lot**. Also needs a **status guard** — the client will happily cancel a delivered reservation. |
| N14 | Confirm collection | `POST` | `/donations/{id}/confirm` | `[exists]`, **retailer-authenticated**. The NGO app has a *"Test Handover Pickup"* button that self-confirms — see §7, this is a product decision, not a modelling one. |

### 5.5 NGO app — history, profile, impact

| # | Action | Method | Path | Notes |
|---|---|---|---|---|
| N15 | Collection history | `GET` | `/recipients/me/pickups?locationId=&from=&to=&limit=&cursor=&sort=completedAt:desc` | Filter by **`locationId`**, not by store-name string as the client does |
| N16 | History store filter options | `GET` | `/recipients/me/partner-locations` | → `[{ locationId, label, retailerName, pickupCount }]` |
| N17 | Custody receipt | `GET` | `/donation-receipts/{id}` | `[exists]`. Must include `handoverPin`, `receivedByLabel`, `co2AvoidedKg`, `totalQuantity` |
| N18 | Export receipt / bulk | `GET` | `/donation-receipts/{id}/pdf`, `/donation-receipts/export?from=&to=&format=csv\|pdf` | **new.** `Download` is imported in two screens and wired to nothing. A custody certificate that cannot be exported is useless for grant reporting. |
| N19 | Impact tiles | `GET` | `/recipients/me/impact?period=2026-09` | → `{ periodLabel, totalWeightKg, totalMeals, totalCo2Kg, totalRetailValue, currency, partnerLocationCount, pickupCount, impactFactor{mealsPerKg, co2KgPerKg} }`. Server-side aggregate — the client `reduce`s an unbounded list. **The "Monthly Recovery Impact" card currently shows lifetime totals.** |
| N20 | Profile | `GET` | `/recipients/me` | + `registrationCode`, `serviceArea`, `initials`, `memberSince`, `isVerified`, `delegates[]` |
| N21 | Edit organisation | `PATCH` | `/recipients/me` | `[orphan]` `{ name?, type?, serviceArea? }` |
| N22 | Edit primary contact | `PATCH` | `/recipients/me/contacts/{id}` | `[orphan]` — the UI submits org and contact fields in one payload; the server fans out |
| N23 | Add authorised staff | `POST` | `/recipients/me/contacts` | `[orphan]` `{ fullName, jobTitle, phone }` |
| N24 | Remove authorised staff | `DELETE` | `/recipients/me/contacts/{id}` | `[orphan]` — **`409` on removing the last one**; the UI guards this client-side |
| N25 | Notification preferences | `PATCH` | `/recipients/me/notification-preferences` | `{ alertRadiusKm, urgencyThreshold, pushNotificationsEnabled }` |
| N26 | Org verification QR | `GET` | `/recipients/me/verification-pass` | The permanent standby credential — see §7 |

---

## 6. Cross-app conflicts to settle

Things the two apps disagree about, or disagree with themselves about. Each needs one answer before implementation.

| # | Conflict | Detail |
|---|---|---|
| 1 | **Currency** | Retailer app hardcodes `$` and `en-US`; NGO app hardcodes `€` and is Barcelona-based (Mercadona, Catalan addresses). Our columns default `'USD'`. Neither app stores a currency at all. **Three locales now exist across the project** — retailer = New York, NGO = Barcelona, schema docs = Paraguay. |
| 2 | **Meals per kg** | Retailer uses **2.5** (4 places). NGO uses **2.1** (2 places). Both hardcoded. `impact_factor.meals_per_kg` must be seeded with one — or become per-region. |
| 3 | **CO₂ per kg** | Retailer code uses **2.0**. NGO code uses **2.5**, while NGO *seed data* is internally consistent at **1.8** (72/40, 58.5/32.5, 104.4/58, 52.2/29). Three values. |
| 4 | **Expiry threshold** | Retailer Home: `<= 1 day`. Retailer Inventory: `<= 2 days OR reason = near_expiry`. NGO alert: `<= 6 hours`. NGO Find Food: critical `< 12h`, expiring `< 24h`. **Four different rules.** Parameterise and pick defaults. |
| 5 | **Pickup code semantics** | Retailer treats `pickupCode` as a **stable per-NGO credential** (`CH-NYC-882`) and matches on substrings. NGO treats `pinCode` as **per-reservation**. Our `pickup_token` is per-donation single-use. |
| 6 | **PIN format** | `'SP-8492'` (seed) vs bare 4-digit (generated) vs "6-digit PIN" (UI copy) vs our `varchar(60)`. Pick one. |
| 7 | **QR payload** | `SPIRA:{donationId}:{pin}` in the NGO header vs the bare PIN on the NGO home screen. Neither is a real QR — both are decorative SVG. Specify the payload server-side. |
| 8 | **Receipt identity** | Retailer generates `FR-REC-######` **client-side** with `Math.random()`. Must move server-side; ours is already `FR-REC-YYYY-NNNNNN`. |
| 9 | **`itemCount` units** | NGO receipt shows "(28 items)" = sum of quantities; the generator sets `res.items.length` = 2 lines. Hence `total_quantity` **and** `line_count`. |
| 10 | **Two radii** | `recipient.alertRadiusKm` (5, editable, notification-scoped) vs the map's `maxDistanceKm` (10, not exposed, list-scoped). Don't collapse them. |
| 11 | **Distance definition** | `distanceKm` in the NGO data is **not reproducible from the coordinates** — store-3 is ≈0.19 km by haversine but the data says 1.6 km. Choose straight-line or road distance; the UI cannot tell. |
| 12 | **Two NGO base addresses** | The map hardcodes `[41.3879, 2.1699]` (Plaça de Catalunya); the itinerary hardcodes *"Carrer dels Motors, 122"* (Zona Franca, several km away). The real base must be a `location` row. |
| 13 | **Unit vocabulary** | Retailer: `types.ts` says `items\|kg\|packs\|crates`, the form offers `units\|packs\|kg\|boxes`, seed data writes `'units'` — a live type error. NGO: 11 free-text plurals. |
| 14 | **`reason` visibility** | Required non-null on `inventory_item` and `donation_line`, and **never shown to the NGO** — the recipient is not told whether food is near-expiry or damaged. Arguably a product gap. |

---

## 7. Open questions

Not schema decisions — product ones. Each blocks a specific endpoint.

**1. Who confirms the handover?** Our `POST /donations/{id}/confirm` is retailer-authenticated and stamps `confirmed_by_user_id` as the certificate's authorising signatory. The NGO app has a button labelled *"Test Handover Pickup (Complete Verification)"* that self-confirms. If NGOs may self-confirm, the certificate's authorisation guarantee changes meaning. My reading is that the button is demo scaffolding — but it needs confirming, because it decides whether N14 gets a recipient-side variant.

**2. Is the surplus shelf partnership-gated?** The NGO app shows stock from 5 stores with no partnership check, while `retailer_recipient_partnership` exists and `charityPartnersCount` implies partnerships matter. Open pool, or partners-only?

**3. What is the "Standby Emergency Pass"?** When the NGO has no reservation it displays a permanent org QR with copy saying stores can scan it *"to instantly dispatch emergency food donations."* That is a **retailer-scans-NGO** path creating an ad-hoc donation — the reverse of everything else. Real feature, or aspirational copy? It needs `recipient.registration_code`, a non-expiring credential, and a new endpoint either way.

**4. Should the "AI" be AI?** Neither app calls Gemini. `@google/genai` is a dependency in both with **zero imports**; the NGO's "AI Live Sentinel" is a two-clause filter and the retailer's "AI Smart Expiry Detector" is one. I recommend implementing both as deterministic server-side rules (~12 lines of SQL) and keeping the AI framing as copy. If an LLM is genuinely wanted it must be server-side — the key must never reach the browser.

**5. Onward distribution — is it in scope?** There is **no beneficiary, distribution, meal-service or NGO-side stock model anywhere in the product.** A repo-wide grep returns three hits, all decorative copy. Meals are a pure `weight × factor` proxy. I have deliberately **not** designed this: it would be invented, not derived. If NGOs must report what they actually distributed, that is a new domain and a separate design pass.

**6. Does `DRIVER_EN_ROUTE` survive?** Documented as recipient-owned, with no UI in either app. Build the "on my way" action, or drop the member.

**7. `AddProductModal` was relabelled** *"Log Near-Expiry or Damaged Item"* → *"Add New Products to Inventory"*. That repositions the flow from exception-reporting to stock-entry, which affects whether `reason` stays required.

---

## 8. Suggested order

1. **Decide §3 (flow direction) and §6 items 1–4.** Everything downstream depends on them.
2. **Org-scoping + `@Roles()`.** Two live roles means this is no longer deferrable.
3. Schema migration: §4 columns and enums, then `location_pickup_slot`.
4. Retailer endpoints R1–R17 — cheapest, the app already matches our model.
5. NGO read surface: N1–N6, N8–N11, N15–N20. N1 is the big one.
6. NGO write surface: N7 (atomic claim with `409`), N13, N25.
7. Export and PDF (R15, N18).
8. `[orphan]` endpoints N2, N21–N24 when the frontend adds entry points.

**Not planned here:** push notification delivery (needs a `push_subscription` table and a provider), onward distribution (question 5), a real routing/ETA service (the apps use hardcoded minutes-per-km heuristics), and marker clustering.
