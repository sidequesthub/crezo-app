-- Plans, features and entitlements for any number of tiers.
-- Design: docs/lld-entitlements.md.
--
-- This migration builds the model and the resolver only. It blocks nothing:
-- the enforcement triggers ship once the app can show a paywall and there is
-- a store product to buy, or a blocked write would reach users as a raw error.

-- ------------------------------------------------------------------ registry

create table if not exists public.features (
  key           text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  kind          text not null check (kind in ('bool', 'limit')),
  -- The most restrictive value — what Free gets, and what anything
  -- unresolvable falls back to. For a limit, JSON null means unlimited.
  default_value jsonb not null,
  label         text not null,
  description   text,
  sort          int not null default 0
);

insert into public.features (key, kind, default_value, label, description, sort) values
  ('deals.active_max',          'limit', '5',     'Active deals',
   'Deals not yet paid. Closed deals never count.', 10),
  ('invoices.issued_per_month', 'limit', '5',     'Invoices per month',
   'Issued invoices, with or without GST, per IST calendar month. Drafts never count.', 20),
  ('invoices.branding',         'bool',  'false', 'Your branding on invoices',
   'Logo and signature, without "Made with Crezo".', 30),
  ('invoices.bill_on_behalf',   'bool',  'false', 'Agency billing',
   'Bill an agency or other party on behalf of a brand.', 40),
  ('mediakit.remove_branding',  'bool',  'false', 'Media kit without Crezo branding',
   'Hides "Powered by Crezo" on the public media kit.', 50),
  ('vault.folders_max',         'limit', '3',     'Vault folders', null, 60)
on conflict (key) do nothing;

-- -------------------------------------------------------------------- plans

alter table public.plans
  add column if not exists rank      int not null default 0,
  add column if not exists is_public boolean not null default true,
  add column if not exists tagline   text;

update public.plans set rank = 0  where code = 'free';
update public.plans set rank = 10 where code = 'pro';

create table if not exists public.plan_features (
  plan_id     uuid not null references public.plans(id) on delete cascade,
  feature_key text not null references public.features(key) on delete cascade,
  value       jsonb not null,           -- JSON null = unlimited
  primary key (plan_id, feature_key)
);

-- Pro: everything. Free has no rows — it gets each feature's default.
insert into public.plan_features (plan_id, feature_key, value)
select p.id, f.key, case f.kind when 'bool' then 'true'::jsonb else 'null'::jsonb end
from public.plans p cross join public.features f
where p.code = 'pro'
on conflict do nothing;

-- How a plan is bought. Empty until the store products exist.
create table if not exists public.plan_prices (
  id               uuid primary key default uuid_generate_v4(),
  plan_id          uuid not null references public.plans(id),
  period           text not null check (period in ('monthly', 'annual')),
  price_inr        int  not null check (price_inr >= 0),
  store            text not null check (store in ('app_store', 'play_store')),
  store_product_id text not null unique,
  active           boolean not null default true,
  created_at       timestamptz default now()
);

-- Replaced by plan_features and plan_prices. They held only placeholders
-- (features '{}' everywhere, Pro at ₹0 with no products).
alter table public.plans
  drop column if exists features,
  drop column if exists period,
  drop column if exists price_inr,
  drop column if exists store_product_ids;

-- A typo in an override is now an error, not a silent no-op.
alter table public.creator_feature_overrides
  drop constraint if exists cfo_feature_fk;
alter table public.creator_feature_overrides
  add constraint cfo_feature_fk foreign key (feature) references public.features(key) on delete cascade;

-- The catalogue is public to signed-in users (pricing screen); only the
-- service role writes.
alter table public.features      enable row level security;
alter table public.plan_features enable row level security;
alter table public.plan_prices   enable row level security;
drop policy if exists features_read on public.features;
create policy features_read on public.features for select to authenticated using (true);
drop policy if exists plan_features_read on public.plan_features;
create policy plan_features_read on public.plan_features for select to authenticated using (true);
drop policy if exists plan_prices_read on public.plan_prices;
create policy plan_prices_read on public.plan_prices for select to authenticated using (active);

-- ---------------------------------------------------------------- resolver

-- One feature's effective value: override › plan value › default.
-- Unlimited is JSON null (a value), not SQL null, so coalesce is safe.
create or replace function public.feature_value(p_creator uuid, p_key text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select o.value from creator_feature_overrides o
      where o.creator_id = p_creator and o.feature = p_key
        and (o.expires_at is null or o.expires_at > now())),
    (select pf.value from plan_features pf join plans p on p.id = pf.plan_id
      where p.code = current_plan(p_creator) and pf.feature_key = p_key),
    (select default_value from features where key = p_key)
  );
$$;

-- Current usage of a limit feature. One hand-written branch per key: no
-- dynamic SQL, each an indexed count on creator_id.
create or replace function public.feature_usage(p_creator uuid, p_key text)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select case p_key
    when 'deals.active_max' then
      (select count(*) from deals where creator_id = p_creator and status <> 'paid')
    when 'invoices.issued_per_month' then
      -- Cancelled invoices still count: issue-cancel-reissue must not dodge it.
      (select count(*) from invoices
        where creator_id = p_creator and issued_at is not null
          and issued_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'))
    when 'vault.folders_max' then
      (select count(*) from vault_folders where creator_id = p_creator)
  end::int;
$$;

-- Throws plan_required when a bool feature is off.
create or replace function public.require_feature(p_creator uuid, p_key text)
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if feature_value(p_creator, p_key) is distinct from 'true'::jsonb then
    raise exception using errcode = 'P0001', message = 'plan_required',
      hint = jsonb_build_object('feature', p_key)::text;
  end if;
end;
$$;

-- Throws plan_limit when adding p_adding would exceed the limit.
create or replace function public.require_capacity(p_creator uuid, p_key text, p_adding int default 1)
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_limit jsonb := feature_value(p_creator, p_key);
  v_used  int;
begin
  if v_limit is null or v_limit = 'null'::jsonb then return; end if;   -- unlimited
  v_used := feature_usage(p_creator, p_key);
  if v_used + p_adding > (v_limit #>> '{}')::int then
    raise exception using errcode = 'P0001', message = 'plan_limit',
      hint = jsonb_build_object('feature', p_key, 'limit', (v_limit #>> '{}')::int, 'used', v_used)::text;
  end if;
end;
$$;

-- The signed-in creator's plan, every feature's effective value, and usage of
-- each limit. Adds `usage`; the other columns keep their shape.
drop function if exists public.my_entitlement();
create function public.my_entitlement()
returns table(plan text, source text, expires_at timestamptz, features jsonb, usage jsonb)
language sql stable security definer set search_path = public, pg_temp as $$
  with me as (select id from creators where user_id = auth.uid()),
  g as (
    select coalesce(plan_code, 'pro') as code, ends_at
    from entitlement_grants, me
    where entitlement_grants.creator_id = me.id
      and revoked_at is null and starts_at <= now()
      and (ends_at is null or ends_at > now())
    order by created_at desc limit 1
  ),
  s as (
    select p.code, sub.current_period_end as ends_at
    from subscriptions sub join me on me.id = sub.creator_id
    join plans p on p.id = sub.plan_id
    where sub.environment = 'production'
      and sub.status in ('trialing','active','grace','cancelled')
      and (sub.current_period_end is null or sub.current_period_end > now())
    order by sub.current_period_end desc nulls first limit 1
  )
  select
    coalesce((select code from g), (select code from s), 'free'),
    case when exists (select 1 from g) then 'grant'
         when exists (select 1 from s) then 'subscription' else 'none' end,
    coalesce((select ends_at from g), (select ends_at from s)),
    (select coalesce(jsonb_object_agg(f.key, feature_value(me.id, f.key)), '{}'::jsonb) from features f, me),
    (select coalesce(jsonb_object_agg(f.key, feature_usage(me.id, f.key)), '{}'::jsonb)
       from features f, me where f.kind = 'limit')
  from (select 1) one;
$$;
grant execute on function public.my_entitlement() to authenticated;

-- Public plans with prices and feature values, for the pricing screen and
-- "which plan unlocks this".
create or replace function public.plan_catalog()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', p.code, 'name', p.name, 'rank', p.rank, 'tagline', p.tagline,
    'features', (select coalesce(jsonb_object_agg(f.key, coalesce(pf.value, f.default_value)), '{}'::jsonb)
                   from features f
                   left join plan_features pf on pf.feature_key = f.key and pf.plan_id = p.id),
    'prices', (select coalesce(jsonb_agg(jsonb_build_object(
                  'period', pp.period, 'price_inr', pp.price_inr,
                  'store', pp.store, 'product_id', pp.store_product_id)), '[]'::jsonb)
                from plan_prices pp where pp.plan_id = p.id and pp.active)
  ) order by p.rank), '[]'::jsonb)
  from plans p where p.active and p.is_public;
$$;
grant execute on function public.plan_catalog() to authenticated;

-- Internal building blocks: not callable from the app directly, or anyone
-- could read another creator's plan by passing their id.
revoke execute on function public.feature_value(uuid, text)    from public, anon, authenticated;
revoke execute on function public.feature_usage(uuid, text)    from public, anon, authenticated;
revoke execute on function public.require_feature(uuid, text)  from public, anon, authenticated;
revoke execute on function public.require_capacity(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.current_plan(uuid)          from public, anon, authenticated;

-- The public media kit tells the page whether to show "Powered by Crezo".
create or replace function public.get_media_kit(p_slug text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select published || jsonb_build_object(
    'show_branding', feature_value(creator_id, 'mediakit.remove_branding') is distinct from 'true'::jsonb)
  from media_kits
  where slug = p_slug and is_live = true and published is not null;
$$;
