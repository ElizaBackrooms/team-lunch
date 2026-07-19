-- Optional job queue for a remote macOS dd-cli worker.
-- App enqueues; Mac agent claims and writes results back.

create type dd_job_type as enum (
  'search',
  'menu',
  'preview',
  'checkout',
  'track',
  'history',
  'reorder'
);

create type dd_job_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);

create table dd_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations (id) on delete cascade,
  session_id uuid references lunch_sessions (id) on delete set null,
  job_type dd_job_type not null,
  status dd_job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index dd_jobs_status_created_idx on dd_jobs (status, created_at);

alter table dd_jobs enable row level security;

create policy "hosts manage dd jobs"
  on dd_jobs for all
  using (
    org_id is null
    or exists (
      select 1 from memberships m
      where m.org_id = dd_jobs.org_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'admin')
    )
  );
