-- Subscriptions, entitlements and admin.
--
-- The rule this schema exists to enforce: **Apple and Google do not decide who
-- has access — this database does.** A store subscription is one input; a
-- manually granted entitlement is another. That is what makes "waive this
-- person's subscription" possible at all, since neither store lets us charge
-- someone nothing on demand.
--
--   has_pro = an active store subscription  OR  an active grant

-- ---------------------------------------------------------------- plans

create table if not exists plans (
  id           uuid primary key default uuid_generate_v4(),
  code         text not null unique,              -- 'pro_monthly', 'pro_annual'
  name         text not null,
  period       text not null check (period in ('monthly', 'annual')),
  price_inr    integer not null,                  -- display only; the stores own real pricing
  store_product_ids jsonb not null default '{}',  -- {"apple": "...", "google": "..."}
  active       boolean not null default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Plans are public: the paywall must render before anyone has a subscription.
alter table plans enable row level security;
drop policy if exists "plans_read" on plans;
create policy "plans_read" on plans for select using (true);

-- -------------------------------------------------------- subscriptions

create table if not exists subscriptions (
  id                uuid primary key default uuid_generate_v4(),
  creator_id        uuid not null references creators(id) on delete cascade,
  plan_id           uuid references plans(id),
  store             text not null check (store in ('apple', 'google')),
  -- Apple's originalTransactionId / Google's purchaseToken. The stable handle
  -- for one subscription across every renewal.
  store_subscription_id text not null,
  status            text not null check (status in
                      ('trialing','active','grace','on_hold','paused',
                       'cancelled','expired','refunded')),
  -- 'cancelled' means auto-renew is off but the period has not ended: access
  -- continues until current_period_end. Only 'expired'/'refunded' cut access.
  current_period_end timestamptz,
  auto_renew        boolean not null default true,
  -- Sandbox and production notifications arrive at the same endpoint. Without
  -- this, a tester's sandbox purchase would grant real access.
  environment       text not null default 'production'
                      check (environment in ('sandbox', 'production')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (store, store_subscription_id)
);

create index if not exists subscriptions_creator_idx on subscriptions(creator_id);
create index if not exists subscriptions_status_idx on subscriptions(status);

alter table subscriptions enable row level security;
-- Read-only to the owner. Writes come from the webhook via the service role,
-- which bypasses RLS — a client must never be able to grant itself a plan.
drop policy if exists "subscriptions_read_own" on subscriptions;
create policy "subscriptions_read_own" on subscriptions for select
  using (creator_id in (select id from creators where user_id = auth.uid()));

-- --------------------------------------------------------------- grants

-- Comped access, extensions, beta testers. Costs nothing and involves no store.
create table if not exists entitlement_grants (
  id           uuid primary key default uuid_generate_v4(),
  creator_id   uuid not null references creators(id) on delete cascade,
  kind         text not null default 'comp' check (kind in ('comp','extension','beta')),
  reason       text not null,                     -- required: future-you will ask why
  granted_by   uuid references auth.users(id),
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,                       -- null = open-ended
  revoked_at   timestamptz,
  created_at   timestamptz default now()
);

create index if not exists grants_creator_idx on entitlement_grants(creator_id);

alter table entitlement_grants enable row level security;
drop policy if exists "grants_read_own" on entitlement_grants;
create policy "grants_read_own" on entitlement_grants for select
  using (creator_id in (select id from creators where user_id = auth.uid()));

-- --------------------------------------------------------------- events

-- Every store notification, kept raw. `dedupe_key` is the store's own
-- notification id: stores retry, and an insert conflict is how we stay
-- idempotent rather than double-applying a renewal.
create table if not exists subscription_events (
  id           uuid primary key default uuid_generate_v4(),
  creator_id   uuid references creators(id) on delete set null,
  store        text check (store in ('apple','google')),
  type         text not null,
  dedupe_key   text not null unique,
  payload      jsonb not null default '{}',
  received_at  timestamptz default now()
);

alter table subscription_events enable row level security;  -- service role only

-- ---------------------------------------------------------------- admin

create table if not exists admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('admin','support')),
  created_at timestamptz default now()
);
alter table admin_users enable row level security;          -- service role only

create table if not exists admin_audit (
  id                uuid primary key default uuid_generate_v4(),
  admin_user_id     uuid references auth.users(id),
  action            text not null,
  target_creator_id uuid references creators(id) on delete set null,
  before            jsonb,
  after             jsonb,
  at                timestamptz default now()
);
alter table admin_audit enable row level security;          -- service role only

-- ---------------------------------------------------------- entitlement

-- The single place access is decided. Everything else reads this.
create or replace function public.has_pro(p_creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from subscriptions s
    where s.creator_id = p_creator_id
      and s.environment = 'production'
      and s.status in ('trialing','active','grace','cancelled')
      and (s.current_period_end is null or s.current_period_end > now())
  ) or exists (
    select 1 from entitlement_grants g
    where g.creator_id = p_creator_id
      and g.revoked_at is null
      and g.starts_at <= now()
      and (g.ends_at is null or g.ends_at > now())
  );
$$;

-- What the app calls: no arguments, no way to ask about somebody else.
create or replace function public.my_entitlement()
returns table (is_pro boolean, source text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select id from creators where user_id = auth.uid()),
  sub as (
    select s.current_period_end as ends
    from subscriptions s join me on me.id = s.creator_id
    where s.environment = 'production'
      and s.status in ('trialing','active','grace','cancelled')
      and (s.current_period_end is null or s.current_period_end > now())
    order by s.current_period_end desc nulls first limit 1
  ),
  grant_ as (
    select g.ends_at as ends
    from entitlement_grants g join me on me.id = g.creator_id
    where g.revoked_at is null and g.starts_at <= now()
      and (g.ends_at is null or g.ends_at > now())
    order by g.ends_at desc nulls first limit 1
  )
  select
    (exists (select 1 from sub) or exists (select 1 from grant_)) as is_pro,
    case when exists (select 1 from grant_) then 'grant'
         when exists (select 1 from sub)    then 'subscription'
         else 'none' end as source,
    coalesce((select ends from grant_), (select ends from sub)) as expires_at;
$$;

grant execute on function public.my_entitlement() to authenticated;

-- updated_at triggers, matching the rest of the schema.
drop trigger if exists set_updated_at on plans;
create trigger set_updated_at before update on plans
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on subscriptions;
create trigger set_updated_at before update on subscriptions
  for each row execute function public.set_updated_at();
