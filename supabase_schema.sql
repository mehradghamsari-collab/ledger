-- Ledger database schema.
-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- 1) Accounts linked by each user
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  eb_account_uid  text not null,
  eb_session_id   text,
  bank_name       text,
  name            text,
  iban            text,
  currency        text,
  balance         numeric,
  valid_until     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, eb_account_uid)
);

-- 2) Transactions (amount: positive = money in, negative = money out)
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid not null references public.accounts(id) on delete cascade,
  eb_tx_id      text,
  booking_date  date,
  amount        numeric not null,
  currency      text,
  description   text,
  raw           jsonb,
  created_at    timestamptz default now(),
  unique (account_id, eb_tx_id)
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, booking_date desc);

-- 3) Editable merchant -> category rules (used later by the categoriser)
create table if not exists public.category_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  pattern     text not null,   -- case-insensitive substring of the description
  category    text not null,   -- groceries, bills, eating, shopping, transport, subs, health, coffee, other
  created_at  timestamptz default now()
);

-- ---- Row-level security: each person sees ONLY their own rows ----
alter table public.accounts        enable row level security;
alter table public.transactions    enable row level security;
alter table public.category_rules  enable row level security;

create policy "own accounts"     on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rules"        on public.category_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
