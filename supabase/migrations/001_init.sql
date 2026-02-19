create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.rag_collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.rag_collections(id) on delete cascade,
  title text not null,
  source_type text not null,
  source_ref text,
  content_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  collection_id uuid not null references public.rag_collections(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  token_count int,
  meta jsonb not null default '{}'::jsonb,
  content_tsv tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.rag_embeddings (
  chunk_id uuid primary key references public.rag_chunks(id) on delete cascade,
  collection_id uuid not null references public.rag_collections(id) on delete cascade,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists public.rag_configs (
  collection_id uuid primary key references public.rag_collections(id) on delete cascade,
  w_vec real not null default 0.7,
  w_text real not null default 0.3,
  top_k int not null default 8,
  vec_candidates int not null default 30,
  text_candidates int not null default 30,
  recency_boost boolean not null default false,
  recency_lambda real not null default 0.02,
  min_score real not null default 0.15,
  updated_at timestamptz not null default now()
);

create index if not exists rag_chunks_tsv_idx on public.rag_chunks using gin(content_tsv);
create index if not exists rag_chunks_collection_idx on public.rag_chunks(collection_id);
create index if not exists rag_embeddings_collection_idx on public.rag_embeddings(collection_id);
create index if not exists rag_embeddings_hnsw_idx
on public.rag_embeddings using hnsw (embedding vector_cosine_ops);

create or replace function public.rag_vector_candidates(
  p_collection_id uuid,
  p_query_embedding vector(1536),
  p_k int
)
returns table (
  chunk_id uuid,
  vec_sim real,
  created_at timestamptz
)
language sql
stable
as $$
  select
    e.chunk_id,
    (1 - (e.embedding <=> p_query_embedding))::real as vec_sim,
    c.created_at
  from public.rag_embeddings e
  join public.rag_chunks c on c.id = e.chunk_id
  where e.collection_id = p_collection_id
  order by e.embedding <=> p_query_embedding asc
  limit p_k;
$$;

create or replace function public.rag_text_candidates(
  p_collection_id uuid,
  p_query text,
  p_k int
)
returns table (
  chunk_id uuid,
  text_score real,
  created_at timestamptz
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    ts_rank_cd(c.content_tsv, plainto_tsquery('english', p_query))::real as text_score,
    c.created_at
  from public.rag_chunks c
  where c.collection_id = p_collection_id
    and c.content_tsv @@ plainto_tsquery('english', p_query)
  order by text_score desc
  limit p_k;
$$;
