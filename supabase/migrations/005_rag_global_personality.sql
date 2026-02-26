-- Global personality: one row. When apply_personality_to_all is true, this prompt
-- is used for every collection instead of each collection's own system_prompt.
create table if not exists public.rag_global_settings (
  id text primary key default 'default',
  global_system_prompt text,
  apply_personality_to_all boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.rag_global_settings (id, global_system_prompt, apply_personality_to_all)
values ('default', null, false)
on conflict (id) do nothing;
