-- Domain: Vault (Asset Management — metadata only)

create table if not exists assets_metadata (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade not null,
  deal_id uuid references deals(id) on delete set null,
  device_asset_id text not null,
  device_album_name text,
  platform text not null default 'other'
    check (platform in ('ig_reel','yt_video','yt_short','story','post','other')),
  deliverable_status text not null default 'raw'
    check (deliverable_status in ('raw','edited','final','submitted','approved')),
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists assets_device_deal_idx
  on assets_metadata(device_asset_id, deal_id);

create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid references deals(id) on delete cascade not null,
  file_url text,
  signed_date date,
  expiry_date date,
  usage_platforms text[] default '{}',
  whitelisting_allowed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table assets_metadata enable row level security;
alter table contracts enable row level security;

create policy "assets_meta_all" on assets_metadata for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

create policy "contracts_all" on contracts for all
  using (deal_id in (select id from deals where creator_id in (select id from creators where user_id = auth.uid())))
  with check (deal_id in (select id from deals where creator_id in (select id from creators where user_id = auth.uid())));

create trigger set_updated_at before update on assets_metadata
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on contracts
  for each row execute function public.set_updated_at();
