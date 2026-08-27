-- Crezo — full database bootstrap
--
-- Consolidates migrations 001–008 into a single idempotent script for standing
-- up a fresh Supabase project. Safe to re-run.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Differs from the migration history in two deliberate ways, both noted inline:
--   1. creators.email is nullable (phone-OTP signups have no email)
--   2. handle_new_user() derives a name for phone-only users
-- ---------------------------------------------------------------------------

-- 001 — Extensions & shared helpers -----------------------------------------

create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- 002 + 008 — Creators (profile & identity) ---------------------------------

create table if not exists creators (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  -- CHANGED from the migration history: was `not null`. Phone-OTP users have
  -- no email at signup, and the not-null constraint made handle_new_user()
  -- fail, which aborts the auth.users insert and breaks signup entirely.
  email text,
  phone text,
  bio text,
  niche text,
  gst_number text,
  upi_id text,
  bank_details text,
  media_kit_url text,
  avatar_url text,
  -- from 008
  pan_number text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists creators_user_id_idx on creators(user_id);

alter table creators enable row level security;

drop policy if exists "creators_select_own" on creators;
drop policy if exists "creators_insert_own" on creators;
drop policy if exists "creators_update_own" on creators;

create policy "creators_select_own" on creators
  for select using (user_id = auth.uid());
create policy "creators_insert_own" on creators
  for insert with check (user_id = auth.uid());
create policy "creators_update_own" on creators
  for update using (user_id = auth.uid());

drop trigger if exists set_updated_at on creators;
create trigger set_updated_at before update on creators
  for each row execute function public.set_updated_at();

-- Auto-create a creator row on signup.
-- CHANGED from the migration history: the original resolved the name purely
-- from email/metadata, so a phone-OTP user produced NULL and violated the
-- name not-null constraint. Falls back through phone, then a literal.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.creators (user_id, name, email, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      new.phone,
      'Creator'
    ),
    new.email,
    new.phone
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Avatar storage
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_upload" on storage.objects;
drop policy if exists "avatar_update" on storage.objects;
drop policy if exists "avatar_select" on storage.objects;

create policy "avatar_upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatar_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatar_select" on storage.objects
  for select using (bucket_id = 'avatars');


-- 003 — Deals (brand deal CRM) ----------------------------------------------

create table if not exists brands (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade not null,
  name text not null,
  contact_person text,
  email text,
  phone text,
  whatsapp text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists deals (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade not null,
  brand_id uuid references brands(id) on delete set null,
  title text not null,
  value_inr numeric not null default 0,
  status text not null default 'pitched'
    check (status in ('pitched','negotiating','confirmed','in_progress','delivered','paid')),
  start_date date,
  end_date date,
  usage_rights text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists deliverables (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid references deals(id) on delete cascade not null,
  title text,
  type text not null default 'reel',
  platform text not null default 'ig_reel'
    check (platform in ('ig_reel','yt_video','yt_short','story','post','other')),
  due_date date,
  status text not null default 'pending',
  content_slot_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table brands enable row level security;
alter table deals enable row level security;
alter table deliverables enable row level security;

drop policy if exists "brands_all" on brands;
create policy "brands_all" on brands for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

drop policy if exists "deals_all" on deals;
create policy "deals_all" on deals for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

drop policy if exists "deliverables_all" on deliverables;
create policy "deliverables_all" on deliverables for all
  using (deal_id in (select id from deals where creator_id in (select id from creators where user_id = auth.uid())))
  with check (deal_id in (select id from deals where creator_id in (select id from creators where user_id = auth.uid())));

drop trigger if exists set_updated_at on brands;
create trigger set_updated_at before update on brands
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on deals;
create trigger set_updated_at before update on deals
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on deliverables;
create trigger set_updated_at before update on deliverables
  for each row execute function public.set_updated_at();


-- 004 + 007 — Content calendar ----------------------------------------------

create table if not exists content_slots (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade not null,
  title text not null,
  platform text not null default 'ig_reel'
    check (platform in ('ig_reel','yt_video','yt_short','story','post','other')),
  type text not null default 'post',
  status text not null default 'idea'
    check (status in ('idea','scripted','shot','edited','posted')),
  scheduled_date date not null,
  scheduled_time time,          -- from 007
  deal_id uuid references deals(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table content_slots enable row level security;

drop policy if exists "content_slots_all" on content_slots;
create policy "content_slots_all" on content_slots for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

drop trigger if exists set_updated_at on content_slots;
create trigger set_updated_at before update on content_slots
  for each row execute function public.set_updated_at();


-- 005 + 008 — Invoices ------------------------------------------------------

create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete cascade not null,
  deal_id uuid references deals(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  invoice_number integer,       -- from 008
  amount numeric not null default 0,
  gst_amount numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'draft'
    check (status in ('draft','sent','acknowledged','paid')),
  gstin text,
  sent_date date,
  paid_date date,
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table invoices enable row level security;

drop policy if exists "invoices_all" on invoices;
create policy "invoices_all" on invoices for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

drop trigger if exists set_updated_at on invoices;
create trigger set_updated_at before update on invoices
  for each row execute function public.set_updated_at();

-- Per-creator invoice numbering
create or replace function set_invoice_number()
returns trigger as $$
declare
  next_num integer;
begin
  select coalesce(max(invoice_number), 0) + 1
    into next_num
    from invoices
    where creator_id = new.creator_id;
  new.invoice_number := next_num;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_invoice_number_trigger on invoices;
create trigger set_invoice_number_trigger
  before insert on invoices
  for each row
  when (new.invoice_number is null)
  execute function set_invoice_number();


-- 006 — Vault (asset metadata + contracts) ----------------------------------

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

drop policy if exists "assets_meta_all" on assets_metadata;
create policy "assets_meta_all" on assets_metadata for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

drop policy if exists "contracts_all" on contracts;
create policy "contracts_all" on contracts for all
  using (deal_id in (select id from deals where creator_id in (select id from creators where user_id = auth.uid())))
  with check (deal_id in (select id from deals where creator_id in (select id from creators where user_id = auth.uid())));

drop trigger if exists set_updated_at on assets_metadata;
create trigger set_updated_at before update on assets_metadata
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on contracts;
create trigger set_updated_at before update on contracts
  for each row execute function public.set_updated_at();
