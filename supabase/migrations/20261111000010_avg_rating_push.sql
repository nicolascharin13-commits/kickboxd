-- avg_rating and ratings_count on matches
alter table matches add column if not exists avg_rating numeric(3,2);
alter table matches add column if not exists ratings_count integer not null default 0;

create or replace function update_match_avg_rating()
returns trigger language plpgsql as $$
declare v_match_id integer;
begin
  v_match_id := coalesce(new.match_id, old.match_id);
  update matches set
    avg_rating = (select round(avg(rating)::numeric, 2) from diary_entries where match_id = v_match_id and rating is not null),
    ratings_count = (select count(*) from diary_entries where match_id = v_match_id and rating is not null)
  where id = v_match_id;
  return new;
end;
$$;

drop trigger if exists trg_match_avg_rating on diary_entries;
create trigger trg_match_avg_rating
after insert or update of rating or delete on diary_entries
for each row execute function update_match_avg_rating();

-- Recalculate existing data
update matches m set
  avg_rating = sub.avg_r,
  ratings_count = sub.cnt
from (
  select match_id, round(avg(rating)::numeric, 2) as avg_r, count(*) as cnt
  from diary_entries where rating is not null
  group by match_id
) sub
where m.id = sub.match_id;

-- push_tokens table
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz default now(),
  unique(user_id, token)
);
alter table push_tokens enable row level security;
create policy "Users manage own tokens" on push_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
