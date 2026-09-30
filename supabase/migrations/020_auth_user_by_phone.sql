-- 020: Exact lookup of an auth user by phone, for the backend's OTP sign-in.
-- Replaces a listUsers({ perPage: 200 }) scan that silently missed every user
-- after the first 200 and would then try to create a duplicate.
-- Service role only: this reads auth.users, so no client may call it.
create or replace function public.auth_user_id_by_phone(p_phone text)
returns uuid
language sql stable security definer set search_path = auth, pg_temp as $$
  select id from auth.users where phone = p_phone limit 1;
$$;

revoke all on function public.auth_user_id_by_phone(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_phone(text) to service_role;
