-- Domain: Content (Calendar & Planning)

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
  deal_id uuid references deals(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table content_slots enable row level security;

create policy "content_slots_all" on content_slots for all
  using (creator_id in (select id from creators where user_id = auth.uid()))
  with check (creator_id in (select id from creators where user_id = auth.uid()));

create trigger set_updated_at before update on content_slots
  for each row execute function public.set_updated_at();
