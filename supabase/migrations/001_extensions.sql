-- Shared extensions
create extension if not exists "uuid-ossp";

-- Auto-update updated_at trigger function (shared by all tables)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
