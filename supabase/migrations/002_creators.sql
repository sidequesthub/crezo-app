-- Domain: Creators (Profile & Identity)

create table if not exists creators (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  bio text,
  niche text,
  gst_number text,
  upi_id text,
  bank_details text,
  media_kit_url text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists creators_user_id_idx on creators(user_id);

alter table creators enable row level security;

create policy "creators_select_own" on creators
  for select using (user_id = auth.uid());
create policy "creators_insert_own" on creators
  for insert with check (user_id = auth.uid());
create policy "creators_update_own" on creators
  for update using (user_id = auth.uid());

create trigger set_updated_at before update on creators
  for each row execute function public.set_updated_at();

-- Auto-create creator row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.creators (user_id, name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatar_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "avatar_select" on storage.objects
  for select using (bucket_id = 'avatars');
