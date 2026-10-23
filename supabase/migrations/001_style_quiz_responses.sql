create table if not exists public.style_quiz_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  answers jsonb not null,
  summary text not null,
  emailed boolean not null default false
);
-- Row level security on with no policies: browsers cannot read or write this table.
-- Only the submit-quiz edge function (service role) can insert.
alter table public.style_quiz_responses enable row level security;
