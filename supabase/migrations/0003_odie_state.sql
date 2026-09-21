-- Persistent state for Odie, Piton's command-center layer. Nothing about
-- the Piton app itself changes here — this is purely an operational layer
-- so a stateless web app (and the existing agents/ scripts) can read and
-- write durable tasks/approvals/agent-run history instead of relying on
-- gitignored local report files or conversation memory.
--
-- Access model: owner-only. There's exactly one operator (the app owner),
-- so RLS checks the JWT email claim directly rather than a role table.
-- The agents/ scripts and the Odie server already use the service-role
-- key, which bypasses RLS entirely.

create type public.odie_task_status as enum (
  'queued', 'planning', 'running', 'waiting',
  'approval_required', 'completed', 'failed', 'cancelled'
);

create type public.odie_approval_status as enum ('pending', 'approved', 'rejected');

create table public.odie_tasks (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  agent text not null,
  priority smallint not null default 3,
  status public.odie_task_status not null default 'queued',
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  dependencies uuid[] not null default '{}',
  result jsonb,
  error text,
  cost_usd numeric(10, 4)
);

create table public.odie_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.odie_tasks (id) on delete cascade,
  action text not null,
  summary text not null,
  status public.odie_approval_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id)
);

-- One row per agent invocation. agents/shared/report.js writes here now,
-- in addition to (not instead of) the local markdown file, so a stateless
-- web client can list run history without filesystem access.
create table public.odie_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  summary text,
  report jsonb
);

-- Small durable key/value store for anything else Odie needs to remember
-- across sessions (last system-map snapshot, known issues, decisions log).
create table public.odie_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.odie_tasks enable row level security;
alter table public.odie_approvals enable row level security;
alter table public.odie_agent_runs enable row level security;
alter table public.odie_state enable row level security;

create policy "owner full access" on public.odie_tasks
  for all using (auth.jwt() ->> 'email' = 'tommy.odell1029@gmail.com')
  with check (auth.jwt() ->> 'email' = 'tommy.odell1029@gmail.com');

create policy "owner full access" on public.odie_approvals
  for all using (auth.jwt() ->> 'email' = 'tommy.odell1029@gmail.com')
  with check (auth.jwt() ->> 'email' = 'tommy.odell1029@gmail.com');

create policy "owner full access" on public.odie_agent_runs
  for all using (auth.jwt() ->> 'email' = 'tommy.odell1029@gmail.com')
  with check (auth.jwt() ->> 'email' = 'tommy.odell1029@gmail.com');

create policy "owner full access" on public.odie_state
  for all using (auth.jwt() ->> 'email' = 'tommy.odell1029@gmail.com')
  with check (auth.jwt() ->> 'email' = 'tommy.odell1029@gmail.com');

create index odie_tasks_status_idx on public.odie_tasks (status);
create index odie_approvals_status_idx on public.odie_approvals (status);
create index odie_agent_runs_agent_idx on public.odie_agent_runs (agent, started_at desc);
