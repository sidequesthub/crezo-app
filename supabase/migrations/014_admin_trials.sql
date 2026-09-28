-- Let the admin console hand out plans: a Pro plan to grant, and trials.
--
-- Until now `plans` held only Free, so there was nothing to give anyone, and a
-- grant could be a comp, an extension or beta access — but not a trial.

-- A trial is a time-boxed grant. It is kept distinct from 'comp' so the
-- console can tell "trying it out" apart from "given it for free".
alter table public.entitlement_grants
  drop constraint if exists entitlement_grants_kind_check;
alter table public.entitlement_grants
  add constraint entitlement_grants_kind_check
  check (kind in ('comp', 'extension', 'beta', 'trial'));

-- Pro. Price and store product ids are placeholders until pricing is decided
-- and the products exist in App Store Connect; granting it needs neither.
-- Features stay empty until the app gates something on them.
insert into public.plans (code, name, period, price_inr, features)
values ('pro', 'Pro', 'monthly', 0, '{}'::jsonb)
on conflict (code) do nothing;
