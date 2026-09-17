-- Media kits: a public, shareable page per creator.
--
-- "Static" here means a published snapshot. `draft` is what the creator edits;
-- `published` is what the world sees, and only changes when they press Update.
--
-- The split is also the privacy boundary: the public page reads `published`
-- and never touches `creators`, so bank details, PAN, GSTIN and phone cannot
-- leak through a policy mistake — they are never in the snapshot at all.

create table if not exists media_kits (
  id           uuid primary key default uuid_generate_v4(),
  creator_id   uuid not null unique references creators(id) on delete cascade,
  slug         text not null unique,
  draft        jsonb not null default '{}',
  published    jsonb,
  published_at timestamptz,
  is_live      boolean not null default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  -- Slugs live at crezo.studio/<slug>, so they must not collide with the
  -- marketing site's own routes.
  constraint media_kits_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  constraint media_kits_slug_reserved check (slug not in
    ('privacy','support','api','admin','app','www','blog','about','terms',
     'login','signup','dashboard','kit','assets','static','help','pricing'))
);

alter table media_kits enable row level security;

drop policy if exists "media_kits_own" on media_kits;
create policy "media_kits_own" on media_kits for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

drop trigger if exists set_updated_at on media_kits;
create trigger set_updated_at before update on media_kits
  for each row execute function public.set_updated_at();

-- The only way the public reads a kit. Returns the published snapshot alone,
-- and only when the creator has it live. No table access is granted to anon.
create or replace function public.get_media_kit(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select published from media_kits
  where slug = p_slug and is_live = true and published is not null;
$$;

grant execute on function public.get_media_kit(text) to anon, authenticated;
