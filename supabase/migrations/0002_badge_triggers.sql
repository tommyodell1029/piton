-- Automatic badge awarding, hooked into events that already exist in the
-- app: verification approval (streaks, first proof) and friendship
-- acceptance (social_starter). `challenge_winner` stays manual until
-- challenge results are actually computed somewhere.

create or replace function public.award_badge(p_user_id uuid, p_code text, p_bonus_xp integer default 25)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_id uuid;
  v_rows integer;
begin
  select id into v_badge_id from public.badges where code = p_code;
  if v_badge_id is null then
    return;
  end if;

  insert into public.user_badges (user_id, badge_id)
  values (p_user_id, v_badge_id)
  on conflict (user_id, badge_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.profiles set xp = xp + p_bonus_xp where id = p_user_id;
  end if;
end;
$$;

revoke execute on function public.award_badge(uuid, text, integer) from public, anon, authenticated;

-- Rebuild the streak trigger so it (a) captures the resulting streak count
-- in a variable instead of duplicating the CASE three times, and (b) awards
-- first_proof / week_streak / month_streak off that same computation.
create or replace function public.bump_streak_on_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cadence public.streak_cadence;
  v_window interval;
  v_prior_current integer;
  v_prior_last timestamptz;
  v_new_current integer;
  v_approved_count integer;
begin
  if new.status <> 'approved' then
    return new;
  end if;
  if (tg_op = 'UPDATE' and old.status = 'approved') then
    return new;
  end if;

  select cadence into v_cadence from public.habits where id = new.habit_id;
  v_window := case v_cadence
    when 'daily' then interval '1 day'
    when 'weekly' then interval '7 days'
    else interval '30 days'
  end;

  select current_count, last_completed_at into v_prior_current, v_prior_last
  from public.streaks where habit_id = new.habit_id;

  v_new_current := case
    when v_prior_last is not null and new.submitted_at - v_prior_last <= v_window * 2
    then coalesce(v_prior_current, 0) + 1
    else 1
  end;

  insert into public.streaks (habit_id, user_id, cadence, current_count, best_count, last_completed_at)
  values (new.habit_id, new.user_id, v_cadence, v_new_current, v_new_current, new.submitted_at)
  on conflict (habit_id) do update
  set
    current_count = v_new_current,
    best_count = greatest(public.streaks.best_count, v_new_current),
    last_completed_at = new.submitted_at;

  update public.profiles set xp = xp + 10 where id = new.user_id;

  select count(*) into v_approved_count from public.habit_verifications
  where user_id = new.user_id and status = 'approved';
  if v_approved_count = 1 then
    perform public.award_badge(new.user_id, 'first_proof');
  end if;

  if v_new_current = 7 then
    perform public.award_badge(new.user_id, 'week_streak');
  elsif v_new_current = 30 then
    perform public.award_badge(new.user_id, 'month_streak');
  end if;

  return new;
end;
$$;

revoke execute on function public.bump_streak_on_verification() from public, anon, authenticated;

-- Friendship acceptance -> social_starter for both parties.
create or replace function public.on_friendship_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    perform public.award_badge(new.user_id, 'social_starter');
    perform public.award_badge(new.friend_id, 'social_starter');
  end if;
  return new;
end;
$$;

revoke execute on function public.on_friendship_accepted() from public, anon, authenticated;

drop trigger if exists on_friendship_status_change on public.friendships;
create trigger on_friendship_status_change
  after insert or update on public.friendships
  for each row execute procedure public.on_friendship_accepted();
