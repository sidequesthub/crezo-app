-- Fix signup for phone-OTP users.
--
-- Phone-OTP signups arrive with no email and no user metadata, so the original
-- handle_new_user() resolved `name` to NULL:
--
--   coalesce(raw_user_meta_data->>'full_name',
--            raw_user_meta_data->>'name',
--            split_part(new.email, '@', 1))   -- all NULL for phone-only users
--
-- That violated creators.name NOT NULL. Because the trigger fires AFTER INSERT
-- on auth.users, the failure aborts the auth.users insert too — so signup fails
-- outright rather than just skipping the creators row.
--
-- Phone OTP (MSG91) is currently the only auth path in the app, so this blocked
-- every new user.

-- creators.email cannot be NOT NULL when users may authenticate by phone alone.
alter table creators alter column email drop not null;

-- Store the phone number, and fall back through phone -> literal for the name.
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
