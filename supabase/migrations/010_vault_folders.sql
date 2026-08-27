-- Domain: Vault folders (app-only grouping of on-device media)
--
-- Folders exist only inside Crezo. Nothing is written to the device's photo
-- library — we store a reference to each asset (`device_asset_id`) and which
-- folder it belongs to. The photo itself never moves, so one asset can belong
-- to several folders and removing it from a folder never touches the file.
--
-- A folder may optionally point at a deal, which is what makes the vault double
-- as per-deal asset tracking.

create table if not exists vault_folders (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade not null,
  name text not null,
  -- Nullable: plenty of folders ("B-roll", "Thumbnails") aren't deal work.
  deal_id uuid references deals(id) on delete set null,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists vault_folders_creator_idx on vault_folders(creator_id);
create index if not exists vault_folders_deal_idx on vault_folders(deal_id);

alter table vault_folders enable row level security;

drop policy if exists "vault_folders_all" on vault_folders;
create policy "vault_folders_all" on vault_folders for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

drop trigger if exists set_updated_at on vault_folders;
create trigger set_updated_at before update on vault_folders
  for each row execute function public.set_updated_at();

-- Link existing asset metadata to folders.
alter table assets_metadata
  add column if not exists folder_id uuid references vault_folders(id) on delete cascade;

create index if not exists assets_metadata_folder_idx on assets_metadata(folder_id);

-- The original unique index assumed one row per (asset, deal). Folders are the
-- grouping now, and the same asset may live in several folders, so the
-- constraint moves to (asset, folder).
drop index if exists assets_device_deal_idx;
create unique index if not exists assets_device_folder_idx
  on assets_metadata(device_asset_id, folder_id);
