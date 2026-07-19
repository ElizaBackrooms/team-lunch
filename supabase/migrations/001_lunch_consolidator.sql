-- Team Lunch Consolidator — MVP schema
-- Org isolation via RLS; viewing sessions is open to org members;
-- joining / paying is opt-in via session_participants.

create extension if not exists "pgcrypto";

-- ─── enums ───────────────────────────────────────────────────────────────────

create type membership_role as enum ('member', 'host', 'admin');
create type session_status as enum (
  'draft',
  'voting',
  'locked',
  'collecting',
  'funded',
  'ordering',
  'tracking',
  'settled',
  'cancelled'
);
create type payment_rail as enum ('stripe', 'privy');
create type payment_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'cancelled'
);
create type participant_status as enum (
  'joined',
  'cart_ready',
  'paid',
  'dropped',
  'refunded'
);

-- ─── core ────────────────────────────────────────────────────────────────────

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  delivery_address jsonb not null default '{}'::jsonb,
  stripe_account_id text,
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  privy_user_id text unique,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table lunch_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  host_user_id uuid not null references profiles (id),
  title text not null default 'Team lunch',
  status session_status not null default 'draft',
  vote_closes_at timestamptz,
  order_by_at timestamptz,
  winning_candidate_id uuid,
  tip_cents int not null default 0,
  fee_estimate_cents int not null default 0,
  currency text not null default 'usd',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table store_candidates (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lunch_sessions (id) on delete cascade,
  dd_store_id text not null,
  name text not null,
  image_url text,
  deal_label text,
  deal_score numeric(6, 2) not null default 0,
  eta_minutes int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, dd_store_id)
);

alter table lunch_sessions
  add constraint lunch_sessions_winning_candidate_fkey
  foreign key (winning_candidate_id) references store_candidates (id);

create table votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lunch_sessions (id) on delete cascade,
  candidate_id uuid not null references store_candidates (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  weight int not null default 1,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

-- Opt-in eaters only. Org members can view sessions without a row here.
create table session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lunch_sessions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status participant_status not null default 'joined',
  food_subtotal_cents int not null default 0,
  fee_share_cents int not null default 0,
  tip_share_cents int not null default 0,
  total_due_cents int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references session_participants (id) on delete cascade,
  session_id uuid not null references lunch_sessions (id) on delete cascade,
  dd_item_id text not null,
  name text not null,
  quantity int not null default 1 check (quantity > 0),
  unit_price_cents int not null,
  modifiers jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table payment_intents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lunch_sessions (id) on delete cascade,
  participant_id uuid not null references session_participants (id) on delete cascade,
  rail payment_rail not null,
  status payment_status not null default 'pending',
  amount_cents int not null,
  currency text not null default 'usd',
  stripe_payment_intent_id text unique,
  privy_tx_hash text unique,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table consolidated_orders (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references lunch_sessions (id) on delete cascade,
  dd_order_id text,
  status text not null default 'pending',
  food_cents int not null default 0,
  fees_cents int not null default 0,
  tip_cents int not null default 0,
  estimated_multi_order_fees_cents int not null default 0,
  fees_saved_cents int not null default 0,
  tracking jsonb not null default '{}'::jsonb,
  receipt jsonb not null default '{}'::jsonb,
  placed_at timestamptz,
  created_at timestamptz not null default now()
);

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  session_id uuid references lunch_sessions (id) on delete set null,
  participant_id uuid references session_participants (id) on delete set null,
  rail payment_rail not null,
  direction text not null check (direction in ('in', 'out', 'refund')),
  amount_cents int not null,
  currency text not null default 'usd',
  external_ref text,
  memo text,
  created_at timestamptz not null default now()
);

-- ─── helpful views ───────────────────────────────────────────────────────────

create or replace view vote_tallies as
select
  c.session_id,
  c.id as candidate_id,
  c.name,
  c.deal_score,
  coalesce(sum(v.weight), 0)::int as vote_count,
  (coalesce(sum(v.weight), 0) + c.deal_score)::numeric as rank_score
from store_candidates c
left join votes v on v.candidate_id = c.id
group by c.id;

-- ─── indexes ─────────────────────────────────────────────────────────────────

create index memberships_user_idx on memberships (user_id);
create index lunch_sessions_org_status_idx on lunch_sessions (org_id, status);
create index votes_session_idx on votes (session_id);
create index order_items_session_idx on order_items (session_id);
create index payment_intents_session_idx on payment_intents (session_id, status);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table lunch_sessions enable row level security;
alter table store_candidates enable row level security;
alter table votes enable row level security;
alter table session_participants enable row level security;
alter table order_items enable row level security;
alter table payment_intents enable row level security;
alter table consolidated_orders enable row level security;
alter table ledger_entries enable row level security;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create policy "profiles self read/update"
  on profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "org members read org"
  on organizations for select
  using (public.is_org_member(id));

create policy "members read memberships"
  on memberships for select
  using (public.is_org_member(org_id));

create policy "members read sessions"
  on lunch_sessions for select
  using (public.is_org_member(org_id));

create policy "hosts manage sessions"
  on lunch_sessions for all
  using (
    exists (
      select 1 from memberships m
      where m.org_id = lunch_sessions.org_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'admin')
    )
  );

create policy "members read candidates"
  on store_candidates for select
  using (
    exists (
      select 1 from lunch_sessions s
      where s.id = store_candidates.session_id
        and public.is_org_member(s.org_id)
    )
  );

create policy "members read votes"
  on votes for select
  using (
    exists (
      select 1 from lunch_sessions s
      where s.id = votes.session_id
        and public.is_org_member(s.org_id)
    )
  );

create policy "members cast own vote"
  on votes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from lunch_sessions s
      where s.id = votes.session_id
        and public.is_org_member(s.org_id)
        and s.status = 'voting'
    )
  );

create policy "members read participants"
  on session_participants for select
  using (
    exists (
      select 1 from lunch_sessions s
      where s.id = session_participants.session_id
        and public.is_org_member(s.org_id)
    )
  );

create policy "user joins self"
  on session_participants for insert
  with check (user_id = auth.uid());

create policy "members read order items"
  on order_items for select
  using (
    exists (
      select 1 from lunch_sessions s
      where s.id = order_items.session_id
        and public.is_org_member(s.org_id)
    )
  );

create policy "participant manages own items"
  on order_items for all
  using (
    exists (
      select 1 from session_participants p
      where p.id = order_items.participant_id
        and p.user_id = auth.uid()
    )
  );

create policy "own payments"
  on payment_intents for select
  using (
    exists (
      select 1 from session_participants p
      where p.id = payment_intents.participant_id
        and p.user_id = auth.uid()
    )
  );

create policy "members read consolidated order"
  on consolidated_orders for select
  using (
    exists (
      select 1 from lunch_sessions s
      where s.id = consolidated_orders.session_id
        and public.is_org_member(s.org_id)
    )
  );

create policy "admins read ledger"
  on ledger_entries for select
  using (
    exists (
      select 1 from memberships m
      where m.org_id = ledger_entries.org_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'admin')
    )
  );
