-- Add user sessions and conversation history

create table if not exists public.rag_users (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists public.rag_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.rag_users(id) on delete cascade,
  collection_id uuid not null references public.rag_collections(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rag_conversations_user_idx on public.rag_conversations(user_id);
create index if not exists rag_conversations_collection_idx on public.rag_conversations(collection_id);
create index if not exists rag_conversations_created_idx on public.rag_conversations(created_at desc);

-- Function to get or create user by phone number
create or replace function public.get_or_create_user(p_phone_number text, p_display_name text default null)
returns uuid
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.rag_users
  where phone_number = p_phone_number;
  
  if v_user_id is null then
    insert into public.rag_users (phone_number, display_name)
    values (p_phone_number, p_display_name)
    returning id into v_user_id;
  else
    update public.rag_users
    set last_active_at = now()
    where id = v_user_id;
  end if;
  
  return v_user_id;
end;
$$;

-- Function to get conversation history for a user
create or replace function public.get_conversation_history(
  p_user_id uuid,
  p_collection_id uuid,
  p_limit int default 50
)
returns table (
  id uuid,
  role text,
  content text,
  sources jsonb,
  created_at timestamptz
)
language sql
stable
as $$
  select id, role, content, sources, created_at
  from public.rag_conversations
  where user_id = p_user_id
    and collection_id = p_collection_id
  order by created_at desc
  limit p_limit;
$$;
