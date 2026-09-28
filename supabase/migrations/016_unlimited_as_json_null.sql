-- "Unlimited" is stored as JSON null. PostgREST turns a JSON null in a request
-- body into SQL NULL, which feature_value()'s coalesce would skip — falling
-- through to the plan and silently ignoring the unlimited setting. The value
-- columns are otherwise NOT NULL, so SQL NULL has no other meaning: coerce it.

create or replace function public.null_value_is_unlimited()
returns trigger language plpgsql as $$
begin
  if new.value is null then new.value := 'null'::jsonb; end if;
  return new;
end;
$$;

drop trigger if exists value_null_is_unlimited on public.plan_features;
create trigger value_null_is_unlimited before insert or update on public.plan_features
  for each row execute function public.null_value_is_unlimited();

drop trigger if exists value_null_is_unlimited on public.creator_feature_overrides;
create trigger value_null_is_unlimited before insert or update on public.creator_feature_overrides
  for each row execute function public.null_value_is_unlimited();

alter table public.creator_feature_overrides alter column value set not null;
