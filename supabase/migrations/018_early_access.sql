-- 018: Early access — everyone gets Pro, free, until paid plans launch.
--
-- The app launches free with no in-app purchase. Plan limits (015) are already
-- enforced server-side, so without this every account would sit on Free and
-- hit the 5-deal / 3-folder caps while we are telling people "it's all free".
--
-- Mechanism: an open-ended `beta` grant on Pro for every creator, including
-- new sign-ups while early_access_open() is true. Grants, not a flag in the
-- entitlement function, so each account's early-access window is an ordinary
-- row the admin dashboard already shows and can edit.
--
-- On paywall day (one migration, nothing in the app changes):
--   update entitlement_grants
--      set ends_at = <launch date> + interval '3 months'
--    where kind = 'beta' and plan_code = 'pro' and revoked_at is null and ends_at is null;
--   create or replace function early_access_open() returns boolean
--     language sql immutable as $$ select false $$;
-- That keeps the site's promise: early adopters get Pro free for 3 months
-- after launch, then fall to Free (5 active deals, 3 vault folders, 5 invoices
-- a month, media kit page) unless they subscribe.

create or replace function early_access_open() returns boolean
language sql immutable as $$ select true $$;

create or replace function grant_early_access() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if early_access_open() then
    insert into entitlement_grants (creator_id, kind, plan_code, reason)
    values (new.id, 'beta', 'pro', 'Early access: free Pro until paid plans launch');
  end if;
  return new;
end;
$$;

drop trigger if exists creators_grant_early_access on creators;
create trigger creators_grant_early_access
  after insert on creators
  for each row execute function grant_early_access();

-- Everyone who signed up before this migration.
insert into entitlement_grants (creator_id, kind, plan_code, reason)
select c.id, 'beta', 'pro', 'Early access: free Pro until paid plans launch'
from creators c
where not exists (
  select 1 from entitlement_grants g
  where g.creator_id = c.id and g.kind = 'beta' and g.revoked_at is null
);
