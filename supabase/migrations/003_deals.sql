-- Domain: Deals (Brand Deal CRM)

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

-- Brands RLS
create policy "brands_all" on brands for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

-- Deals RLS
create policy "deals_all" on deals for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

-- Deliverables RLS (via deal → creator)
create policy "deliverables_all" on deliverables for all
  using (deal_id in (select id from deals where creator_id in (select id from creators where user_id = auth.uid())))
  with check (deal_id in (select id from deals where creator_id in (select id from creators where user_id = auth.uid())));

create trigger set_updated_at before update on brands
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on deals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on deliverables
  for each row execute function public.set_updated_at();
