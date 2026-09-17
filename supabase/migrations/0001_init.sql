-- Piton core schema
-- Run via `supabase db push` or the Supabase SQL editor.

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'New Climber',
  avatar_url text,
  xp integer not null default 0,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by any authenticated user"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- HABITS
-- ============================================================
create type public.habit_category as enum ('fitness', 'reading', 'meditation', 'custom');
create type public.streak_cadence as enum ('daily', 'weekly', 'monthly');
create type public.verification_method as enum (
  'healthkit', 'health_connect', 'photo', 'gps', 'timer',
  'step_count', 'workout', 'ai_image', 'manual_ai_review'
);
create type public.verification_status as enum ('pending', 'approved', 'rejected');

create table public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category public.habit_category not null default 'custom',
  verification_method public.verification_method not null,
  cadence public.streak_cadence not null default 'daily',
  target_value numeric,
  target_unit text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index habits_user_id_idx on public.habits (user_id);

alter table public.habits enable row level security;

create policy "Users manage their own habits"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- STREAKS
-- ============================================================
create table public.streaks (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null unique references public.habits (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  cadence public.streak_cadence not null,
  current_count integer not null default 0,
  best_count integer not null default 0,
  last_completed_at timestamptz
);

alter table public.streaks enable row level security;

create policy "Users read their own streaks"
  on public.streaks for select
  using (auth.uid() = user_id);

-- ============================================================
-- HABIT VERIFICATIONS (the "proof")
-- ============================================================
create table public.habit_verifications (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  method public.verification_method not null,
  status public.verification_status not null default 'pending',
  proof_url text,
  proof_metadata jsonb,
  ai_confidence numeric,
  submitted_at timestamptz not null default now()
);

create index habit_verifications_habit_id_idx on public.habit_verifications (habit_id);

alter table public.habit_verifications enable row level security;

create policy "Users manage their own verifications"
  on public.habit_verifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bump the streak + award XP whenever a verification is approved
-- (either on insert, or when an AI review later flips pending -> approved).
create function public.bump_streak_on_verification()
returns trigger as $$
declare
  v_cadence public.streak_cadence;
  v_window interval;
  v_last timestamptz;
begin
  if new.status <> 'approved' then
    return new;
  end if;
  if (tg_op = 'UPDATE' and old.status = 'approved') then
    return new; -- already counted
  end if;

  select cadence into v_cadence from public.habits where id = new.habit_id;
  v_window := case v_cadence
    when 'daily' then interval '1 day'
    when 'weekly' then interval '7 days'
    else interval '30 days'
  end;

  insert into public.streaks (habit_id, user_id, cadence, current_count, best_count, last_completed_at)
  values (new.habit_id, new.user_id, v_cadence, 1, 1, new.submitted_at)
  on conflict (habit_id) do update
  set
    current_count = case
      when public.streaks.last_completed_at is not null
        and new.submitted_at - public.streaks.last_completed_at <= v_window * 2
      then public.streaks.current_count + 1
      else 1
    end,
    best_count = greatest(
      public.streaks.best_count,
      case
        when public.streaks.last_completed_at is not null
          and new.submitted_at - public.streaks.last_completed_at <= v_window * 2
        then public.streaks.current_count + 1
        else 1
      end
    ),
    last_completed_at = new.submitted_at;

  update public.profiles set xp = xp + 10 where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_verification_approved
  after insert or update on public.habit_verifications
  for each row execute procedure public.bump_streak_on_verification();

-- ============================================================
-- GAMIFICATION: BADGES
-- ============================================================
create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  title text not null,
  description text not null,
  icon_url text
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy "Badges are publicly readable" on public.badges for select using (true);

create policy "Users read their own badges"
  on public.user_badges for select
  using (auth.uid() = user_id);

-- ============================================================
-- SOCIAL: FRIENDS, GROUPS, CHALLENGES
-- ============================================================
create table public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.friendships enable row level security;

create policy "Users see friendships they're part of"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users create friend requests"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "Users update friendships they're part of"
  on public.friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  member_count integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "Members read their groups"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

create policy "Owners manage their groups"
  on public.groups for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Members read their memberships"
  on public.group_members for select
  using (auth.uid() = user_id);

create policy "Users join groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create function public.increment_group_member_count()
returns trigger as $$
begin
  update public.groups set member_count = member_count + 1 where id = new.group_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_group_member_added
  after insert on public.group_members
  for each row execute procedure public.increment_group_member_count();

create table public.challenges (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups (id) on delete cascade,
  title text not null,
  habit_category public.habit_category not null,
  start_date timestamptz not null,
  end_date timestamptz not null
);

alter table public.challenges enable row level security;

create policy "Challenges are publicly readable"
  on public.challenges for select
  using (true);

-- ============================================================
-- STORAGE: proof photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

create policy "Users upload their own proofs"
  on storage.objects for insert
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Proofs are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'proofs');
