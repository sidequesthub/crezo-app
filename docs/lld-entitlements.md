# LLD — Plans, features and entitlements

Status: **proposed** (2026-09-28). The design is final; the proposed tier
values in §3 need a product decision before they're seeded.

## 1. Goals

- **Any number of tiers.** Code never asks "is this user Pro?". It asks "can
  this user do X?" or "how many X may they have?". Adding a tier is a data
  change, not a code change.
- **The server enforces.** The app talks to Supabase directly (see CLAUDE.md),
  so a check that only runs in the app can be bypassed. Anything with real
  value is enforced in Postgres. The app only decides what to *show*.
- **Plans live in the database and can be edited from the admin console.**
  Changing what a tier includes, launching a tier, giving one person an
  exception, or running a trial needs no release.
- **Nobody loses their data.** Downgrading never deletes data or locks it from
  being read. It only stops new creation beyond the limit.

Out of scope for now: add-on purchases (e.g. "+10 invoices"), usage-based
billing, team seats. §10 shows where each would fit.

## 2. Concepts

| Concept | What it is | Example |
|---|---|---|
| **Feature** | A named capability, defined once, owned by code | `invoices.gst`, `deals.active_max` |
| **Feature kind** | `bool` (on/off) or `limit` (integer, `null` = unlimited) | |
| **Plan** | A tier: a bundle of feature values | Free, Creator, Pro |
| **Plan value** | What one plan sets for one feature | Creator → `invoices.issued_per_month = 15` |
| **Price** | A way to buy a plan: period + store product | Creator monthly, iOS `crezo.creator.monthly` |
| **Access source** | Why a creator is on a plan | grant (trial / free access) › subscription › default Free |
| **Override** | A one-person exception to one feature, optionally time-boxed | "give Asha 50 invoices this month" |

**Resolution:** `effective(feature) = override ?? plan value ?? feature default`.
The feature default is the *most restrictive* value, i.e. what Free gets.
Missing data therefore never grants more than intended.

## 3. What to gate

### Principles

1. **Keep the daily habit free.** Calendar, deal tracking and deadline
   reminders bring people back every day. Gating them kills retention before
   anyone sees the paid value.
2. **Gate the moments that are worth money:** getting paid (invoicing),
   looking professional to brands (branding), doing taxes (FY reports).
3. **Limits over locks.** "5 active deals" lets a new creator use the full
   product and hit the wall only once they've grown into it.
4. **Never gate the user's own data.** Viewing, editing, deleting and
   exporting what they already entered is always free, on every tier.
5. **One reason per gate.** Each gated feature must be explainable in a
   single line on the paywall.

### Proposed catalog

The values below are a proposal. Pricing follows the spec (₹299–499/month).

| Feature key | Kind | Free | Creator ₹299 | Pro ₹499 | Enforced in |
|---|---|---|---|---|---|
| `deals.active_max` | limit | 5 | 25 | ∞ | DB trigger on `deals` insert |
| `invoices.issued_per_month` | limit | 2 | 15 | ∞ | `issue_invoice()` RPC |
| `invoices.gst` (CGST/SGST/IGST breakup) | bool | ✗ | ✓ | ✓ | `issue_invoice()` RPC |
| `invoices.branding` (logo, signature, no "Made with Crezo") | bool | ✗ | ✓ | ✓ | client (PDF is rendered on device) |
| `invoices.bill_on_behalf` (agency billing) | bool | ✗ | ✗ | ✓ | DB trigger on `invoices` |
| `mediakit.remove_branding` | bool | ✗ | ✓ | ✓ | `get_media_kit()` (server-rendered page) |
| `vault.folders_max` | limit | 3 | ∞ | ∞ | DB trigger on `vault_folders` insert |
| `reports.fy_export` (FY earnings + TDS statement for ITR) *(future)* | bool | ✗ | ✗ | ✓ | server export endpoint |
| `mediakit.analytics` *(future)* | bool | ✗ | ✗ | ✓ | query RLS |

**Always free:** calendar and content slots; the deal pipeline, up to the
limit; deliverables and approval states; deadline and payment reminders;
drafts and proforma invoices, which are unlimited because only *issuing*
counts; publishing the media kit (a Free kit carries "Powered by Crezo", which
is free distribution); profile; data export; account deletion.

Why these three tiers:
- **Free** covers a creator doing a few deals.
- **Creator** is for someone who is billing brands regularly and needs to look
  professional.
- **Pro** is for someone running this as a business: unlimited everything,
  agency billing, tax reports.

A future **Studio** tier (managers, teams) would add `team.seats` and needs no
schema change.

## 4. Data model

```sql
-- The registry. One row per feature key used in code; seeded by migration.
create table features (
  key          text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  kind         text not null check (kind in ('bool', 'limit')),
  default_value jsonb not null,          -- most restrictive; what Free gets
  label        text not null,            -- shown on paywall / pricing screen
  description  text,
  sort         int not null default 0
);

-- Tiers.
alter table plans
  add column rank      int not null default 0,     -- ordering: Free 0 < Creator 10 < Pro 20
  add column is_public boolean not null default true, -- false = legacy/hidden, still honoured
  add column tagline   text;
-- plans.features (jsonb), plans.period/price_inr/store_product_ids move out (see below).

-- One value per (plan, feature). Absent row = feature default.
create table plan_features (
  plan_id     uuid references plans(id) on delete cascade,
  feature_key text references features(key) on delete cascade,
  value       jsonb not null,           -- true/false, or an integer, or null (= unlimited)
  primary key (plan_id, feature_key)
);

-- How a plan is bought. A plan can have many (monthly, annual; iOS, Android).
create table plan_prices (
  id               uuid primary key default uuid_generate_v4(),
  plan_id          uuid not null references plans(id),
  period           text not null check (period in ('monthly', 'annual')),
  price_inr        int  not null,
  store            text not null check (store in ('app_store', 'play_store')),
  store_product_id text not null unique,     -- the webhook's lookup key
  active           boolean not null default true
);

-- Exists already; gains an FK so a typo can't create a phantom feature.
alter table creator_feature_overrides
  add constraint cfo_feature_fk foreign key (feature) references features(key);
```

Why a table and not the current `plans.features` jsonb: with a table, a
misspelt key is an FK error instead of a silent no-op. It also lets the admin
matrix edit one cell at a time, and "which plans unlock X" becomes a plain
query.

Row-level security:
- `features`, `plans`, `plan_features` and active `plan_prices` are readable
  by any signed-in user, because the pricing screen needs them.
- Only the admin console (service role) writes to them.
- Overrides stay readable only by their own creator.

## 5. Resolution (SQL)

```sql
-- Which plan a creator is on. Exists: newest live grant › live production
-- subscription › 'free'.
current_plan(creator_id) returns text

-- One feature's effective value.
create function feature_value(p_creator uuid, p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select o.value from creator_feature_overrides o
      where o.creator_id = p_creator and o.feature = p_key
        and (o.expires_at is null or o.expires_at > now())),
    (select pf.value from plan_features pf join plans p on p.id = pf.plan_id
      where p.code = current_plan(p_creator) and pf.feature_key = p_key),
    (select default_value from features where key = p_key)
  );
$$;
```

Note on `coalesce` with `limit` values: "unlimited" is JSON `null`, and
`coalesce` would skip past it. The real implementation therefore uses
`exists`-guarded `case` branches, not `coalesce`. It is written as above only
for readability.

`my_entitlement()` keeps its current return shape (`plan, source, expires_at,
features`), so the app is unaffected. Two changes:
- `features` becomes the **full** map: every registered key with its effective
  value. The client never has to guess a default.
- A new `usage` map gives current counts for `limit` features, so the app can
  show "4 of 5".

`plan_catalog()` returns every public plan with its prices and feature values.
It feeds the pricing screen and "which plan unlocks this?".

## 6. Enforcement

### Primitives

```sql
-- Throws plan_required if a bool feature is off.
require_feature(p_creator uuid, p_key text)

-- Throws plan_limit if usage + p_adding would exceed the limit. null limit = pass.
require_capacity(p_creator uuid, p_key text, p_adding int default 1)

-- Current usage per limit feature. One CASE branch per key, written by hand:
-- no dynamic SQL, and each count is an indexed query.
feature_usage(p_creator uuid, p_key text) returns int
  -- deals.active_max          → count(deals) where status not in CLOSED
  -- invoices.issued_per_month → count(invoices) where issued_at in the current IST month
  -- vault.folders_max         → count(vault_folders)
```

Usage is **counted on demand, not stored**. A stored counter drifts on every
delete, cancel or bug. The counts are small (tens of rows per creator) and
indexed on `creator_id`. Revisit only if a limit needs counting over
thousands of rows.

### Where the checks go

| Gate | Hook |
|---|---|
| `deals.active_max` | `before insert on deals` → `require_capacity`. Also `before update` when status moves from closed back to open. |
| `invoices.issued_per_month`, `invoices.gst` | Inside `issue_invoice()`. Drafts are never blocked, only issuing is. |
| `invoices.bill_on_behalf` | `before insert or update on invoices` when the invoice's `brand_id` ≠ the deal's brand. |
| `vault.folders_max` | `before insert on vault_folders` |
| `mediakit.remove_branding` | `get_media_kit()` returns `show_branding`; the landing page obeys it. |
| `invoices.branding` | Client only: the PDF is rendered on the device. The value at stake is cosmetic, so this is an accepted gap. Move it to the server if PDFs ever render there. |

A trigger checks capacity *before* the row exists, so a limit of 5 allows the
5th insert and blocks the 6th.

Race: two simultaneous inserts at 4 of 5 could both pass. For a per-creator
UI limit this is acceptable; the worst case is one over the limit. If it ever
matters, add `pg_advisory_xact_lock(hashtext(creator_id::text))` in the
trigger.

### Error contract

Raised as `P0001`, which PostgREST passes through as `{ code, message, hint }`:

| `message` | `hint` (JSON) | App reaction |
|---|---|---|
| `plan_required` | `{"feature":"invoices.gst"}` | open the paywall for that feature |
| `plan_limit` | `{"feature":"deals.active_max","limit":5,"used":5}` | open the paywall, saying "You've reached 5 active deals" |

`lib/subscription.ts` exposes `planError(e)`, which turns a Supabase error
into `{feature, limit?, used?} | null`. Every write path that can hit a gate
passes errors through it.

## 7. Client

```ts
// constants/features.ts — the typed mirror of the registry.
export type BoolFeature  = 'invoices.gst' | 'invoices.branding' | 'invoices.bill_on_behalf'
                         | 'mediakit.remove_branding' | 'reports.fy_export';
export type LimitFeature = 'deals.active_max' | 'invoices.issued_per_month' | 'vault.folders_max';

// lib/subscription.ts
has(e, 'invoices.gst'): boolean
limit(e, 'deals.active_max'): number | null        // null = unlimited
remaining(e, 'deals.active_max'): number | null     // from e.usage
cheapestPlanFor(catalog, feature, need?): Plan      // "Available on Creator"
planError(err): PlanError | null
```

- **`EntitlementProvider`** (in `_layout.tsx`) loads `my_entitlement()`. It
  refreshes on sign-in, on returning to the foreground, and after a purchase.
  The last value is cached in AsyncStorage so the right UI shows offline. The
  server still enforces, so a stale cache can only show a lock too few, never
  grant access.
- **`useEntitlement()`** returns `{ plan, has, limit, remaining, refresh }`.
- **`<Gate feature="invoices.gst">`** renders its children, or a small lock
  row that opens the paywall. The UX stays minimal:
  - no banners and no "upgrade" badges scattered around;
  - a limit counter ("4 of 5 active deals") appears only at 80% of the limit
    or above.
- **The paywall** is a single sheet with one feature-specific headline, e.g.
  "Issue unlimited invoices", plus the cheapest plan that unlocks it, its
  price, 3 bullets and one CTA. It opens from a `<Gate>` tap or from a
  `planError`.

After a purchase the webhook arrives asynchronously, usually within about 2 s
but not guaranteed. So the app calls `POST /api/entitlement/sync` on the
admin app. That endpoint checks the purchase with RevenueCat's REST API
(secret key, server side), upserts `subscriptions`, and returns the new
entitlement. The webhook stays the backstop for renewals and cancellations.

## 8. Store integration

- **Webhook:** map `event.product_id → plan_prices.store_product_id →
  plan_id` and store `plan_id` on the subscription.
  **This is a live bug today:** `plan_id` is never set, and `current_plan()`
  inner-joins on it, so a paying customer would resolve to Free. An unknown
  product id is still recorded, with `plan_id = null`, and logged loudly
  rather than silently ignored.
- **Upgrades and downgrades between tiers** arrive as `PRODUCT_CHANGE`. They
  update `plan_id` when the event says the change takes effect: immediately
  for upgrades, at renewal for downgrades on iOS.
- RevenueCat "entitlements" are not used for gating; the database is the
  source of truth. One RevenueCat entitlement per plan is still configured,
  purely so its dashboard reports cleanly.

## 9. Lifecycle rules

| Situation | Behaviour |
|---|---|
| Downgrade or expiry while over a limit | Nothing is deleted or hidden. Everything stays editable. New creation is blocked until usage is back under the limit. |
| Monthly limit | Resets at the start of the IST calendar month. It is counted, not reset by a job. |
| Already-issued invoices | Never change; GST invoices are immutable anyway. Branding changes apply to new PDFs only. |
| Trial ends | Same as downgrade. A trial is a grant with `kind='trial'` and a `plan_code`, so trials work for any tier. |
| Making a plan **more** generous | Edit its values in place; everyone on it benefits immediately. |
| Making a plan **less** generous, or repricing | Never edit in place. Create a new plan (`creator_2027`), set the old one `is_public=false`. Existing subscribers keep what they paid for (grandfathering). |
| Retiring a feature | Delete its `features` row, which cascades out of plans and overrides, together with the code release that removes it. |

## 10. Extension points

- **New tier:** insert into `plans`, set its values in the admin matrix, add
  `plan_prices` rows once the store products exist. No code change.
- **New gated feature:**
  1. a migration adds the `features` row plus values for existing plans;
  2. the key goes into `constants/features.ts`;
  3. add a server check if it has real value, and a `<Gate>` in the UI.
- **Add-ons (future):** a purchase creates a time-boxed override, e.g.
  `invoices.issued_per_month` + 10. Overrides would then need an `op`
  (`set`/`add`) column; that is the only schema change.
- **Team seats (future):** `team.seats` limit feature. Enforcing it needs the
  team schema, not changes here.

## 11. Admin console

- **Plans page:** a matrix with features as rows and plans as columns.
  - A bool cell is a toggle; a limit cell is a number or "∞".
  - Create a plan, set its rank, and mark it public or hidden.
  - Prices per plan, listing the store product ids.
  - Every change goes to `admin_audit`.
- **User page:**
  - an "Effective features" table showing the value and its source
    (plan / override / default) plus current usage;
  - "Add exception" (feature, value, optional expiry, reason), removable.

## 12. Migration from today

1. Create `features` and `plan_features`, move values out of `plans.features`
   (currently all `{}`), and drop that column.
2. Create `plan_prices`. Pro's ₹0 placeholder becomes the real Creator/Pro rows
   once pricing is decided. Drop `plans.period`, `price_inr` and
   `store_product_ids`.
3. Add `feature_value`, `feature_usage`, `require_feature`,
   `require_capacity`, `plan_catalog`. Rewrite `my_entitlement` to return the
   full map plus usage.
4. Webhook: set `plan_id` from `plan_prices`, and add the `/api/entitlement/sync`
   endpoint.
5. Triggers and RPC checks per §6, shipped **after** the app can show a
   paywall. Until then a blocked write would reach the user as a raw error.
6. App: provider, `<Gate>`, paywall sheet, `planError` on write paths.
7. Admin: plans matrix, effective features, exceptions.

Current creators on launch day: every existing account gets an open-ended
`comp` grant on the top plan (early-adopter thank-you) *or* starts on Free.
This is a product call, listed in §13.

## 13. Decisions needed

1. **Tiers and values in §3.** Two paid tiers or one to start? Are the free
   limits (5 deals, 2 invoices/month, 3 folders) right?
2. **GST behind a paywall?** It's the strongest "serious creator" signal, but
   an unregistered small creator never needs it, so it could be the main
   reason to upgrade.
3. **Launch-day treatment of existing users:** comp them or not.
4. **Annual pricing:** offer it from day one (typically ~2 months free)?
