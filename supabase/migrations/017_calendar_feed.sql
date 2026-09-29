-- Calendar subscription feed.
--
-- Each creator gets a private link (crezo.studio/cal/<token>.ics) they can
-- subscribe to from Google, Apple or Outlook Calendar. The token is the only
-- credential: long, random, and replaceable — resetting it cuts off every
-- calendar that had the old link.

create table if not exists public.calendar_feeds (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

alter table public.calendar_feeds enable row level security;
-- No policies: only the functions below touch this table.

-- 64 hex characters from two v4 UUIDs: ~244 bits of randomness, no extension needed.
create or replace function public.new_feed_token()
returns text language sql volatile set search_path = public, pg_temp as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

-- The signed-in creator's feed token, created on first use.
create or replace function public.my_calendar_feed()
returns text language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_creator uuid;
  v_token   text;
begin
  select id into v_creator from creators where user_id = auth.uid();
  if v_creator is null then raise exception 'not signed in'; end if;

  select token into v_token from calendar_feeds where creator_id = v_creator;
  if v_token is null then
    insert into calendar_feeds (creator_id, token) values (v_creator, new_feed_token())
    on conflict (creator_id) do nothing
    returning token into v_token;
    if v_token is null then
      select token into v_token from calendar_feeds where creator_id = v_creator;
    end if;
  end if;
  return v_token;
end;
$$;

-- Replace the token; calendars subscribed with the old link stop updating.
create or replace function public.reset_calendar_feed()
returns text language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_creator uuid;
  v_token   text := new_feed_token();
begin
  select id into v_creator from creators where user_id = auth.uid();
  if v_creator is null then raise exception 'not signed in'; end if;

  insert into calendar_feeds (creator_id, token) values (v_creator, v_token)
  on conflict (creator_id) do update set token = excluded.token, rotated_at = now();
  return v_token;
end;
$$;

-- What the feed shows, looked up by token alone. Called anonymously by the
-- website, the way get_media_kit() is — the token is the authorisation.
-- Returns only what a calendar entry needs: no amounts, no notes.
create or replace function public.calendar_feed_events(p_token text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with c as (
    select creator_id from calendar_feeds where token = p_token and length(p_token) = 64
  )
  select case when not exists (select 1 from c) then null else jsonb_build_object(
    'slots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', s.title, 'platform', s.platform, 'status', s.status,
        'date', s.scheduled_date, 'time', s.scheduled_time,
        'deal_id', s.deal_id, 'brand', b.name, 'updated_at', s.updated_at
      ) order by s.scheduled_date)
      from (
        select * from content_slots
        where creator_id = (select creator_id from c)
          and scheduled_date between current_date - 30 and current_date + 365
        order by scheduled_date limit 1000
      ) s
      left join deals d on d.id = s.deal_id
      left join brands b on b.id = d.brand_id
    ), '[]'::jsonb),
    'deliverables', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'title', v.title, 'platform', v.platform, 'status', v.status,
        'date', v.due_date, 'deal_id', v.deal_id, 'deal', v.deal_title,
        'brand', v.brand, 'updated_at', v.updated_at
      ) order by v.due_date)
      from (
        select dl.*, d.title as deal_title, b.name as brand
        from deliverables dl
        join deals d on d.id = dl.deal_id
        left join brands b on b.id = d.brand_id
        where d.creator_id = (select creator_id from c)
          and dl.due_date between current_date - 30 and current_date + 365
        order by dl.due_date limit 1000
      ) v
    ), '[]'::jsonb)
  ) end;
$$;

revoke execute on function public.new_feed_token() from public, anon, authenticated;
revoke execute on function public.my_calendar_feed() from public, anon;
revoke execute on function public.reset_calendar_feed() from public, anon;
grant  execute on function public.my_calendar_feed() to authenticated;
grant  execute on function public.reset_calendar_feed() to authenticated;
grant  execute on function public.calendar_feed_events(text) to anon, authenticated;
