-- Generalise entitlement from "is this person Pro" to "which plan are they on".
--
-- has_pro() assumed exactly one paid tier. The moment a second plan exists
-- every caller is wrong, and the fix is a schema change rather than a config
-- one. current_plan() returns a plan code instead, so adding a tier is a row
-- in `plans`, not a migration.

-- plans.features holds each tier's capability defaults.
alter table plans add column if not exists features jsonb not null default '{}';

-- Every creator resolves to a plan, so 'free' must exist as a real row.
insert into plans (code, name, period, price_inr, features, active)
values ('free', 'Free', 'monthly', 0, '{}'::jsonb, true)
on conflict (code) do nothing;

-- A comp has to say which tier it grants, otherwise "give them access" is
-- ambiguous as soon as tiers differ.
alter table entitlement_grants
  add column if not exists plan_code text;

-- Per-user capability overrides: beta access, a raised limit for one creator,
-- a feature switched off for someone abusing it. Separate from grants because
-- this is "what can they do", not "what are they paying for".
create table if not exists creator_feature_overrides (
  id          uuid primary key default uuid_generate_v4(),
  creator_id  uuid not null references creators(id) on delete cascade,
  feature     text not null,
  value       jsonb not null,          -- true/false, or a number for a limit
  reason      text not null,
  granted_by  uuid references auth.users(id),
  expires_at  timestamptz,
  created_at  timestamptz default now(),
  unique (creator_id, feature)
);

alter table creator_feature_overrides enable row level security;
drop policy if exists "overrides_read_own" on creator_feature_overrides;
create policy "overrides_read_own" on creator_feature_overrides for select
  using (creator_id in (select id from creators where user_id = auth.uid()));

-- Which plan is in force. A grant outranks a store subscription, so comping
-- someone who already pays does not downgrade them.
create or replace function public.current_plan(p_creator_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select coalesce(g.plan_code, 'pro')
       from entitlement_grants g
      where g.creator_id = p_creator_id
        and g.revoked_at is null
        and g.starts_at <= now()
        and (g.ends_at is null or g.ends_at > now())
      order by g.created_at desc
      limit 1),
    (select p.code
       from subscriptions s
       join plans p on p.id = s.plan_id
      where s.creator_id = p_creator_id
        and s.environment = 'production'
        and s.status in ('trialing','active','grace','cancelled')
        and (s.current_period_end is null or s.current_period_end > now())
      order by s.current_period_end desc nulls first
      limit 1),
    'free'
  );
$$;

-- Everything a client needs in one call: the plan, where it came from, when it
-- ends, and the resolved capability set.
-- Postgres will not replace a function whose OUT columns changed.
drop function if exists public.my_entitlement();
create or replace function public.my_entitlement()
returns table (plan text, source text, expires_at timestamptz, features jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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
  ),
  chosen as (
    select coalesce((select code from g), (select code from s), 'free') as code,
           coalesce((select ends_at from g), (select ends_at from s))   as ends_at,
           case when exists (select 1 from g) then 'grant'
                when exists (select 1 from s) then 'subscription'
                else 'none' end as src
  ),
  overrides as (
    select coalesce(jsonb_object_agg(o.feature, o.value), '{}'::jsonb) as j
      from creator_feature_overrides o, me
     where o.creator_id = me.id
       and (o.expires_at is null or o.expires_at > now())
  )
  select
    chosen.code,
    chosen.src,
    chosen.ends_at,
    -- Plan defaults first, then per-user overrides on top.
    coalesce((select features from plans where code = chosen.code), '{}'::jsonb)
      || (select j from overrides)
  from chosen;
$$;

grant execute on function public.my_entitlement() to authenticated;


drop function if exists public.has_pro(uuid);
