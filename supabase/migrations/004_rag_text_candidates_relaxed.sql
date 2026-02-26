-- Relaxed BM25: match any of the query terms (OR) instead of all (AND).
-- Use when plainto_tsquery returns 0 results so queries like "how and when my points are credited"
-- still find chunks that contain "points" or "credited" / "credit" (e.g. HPPL FAQ).
create or replace function public.rag_text_candidates_relaxed(
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
  with q_lex as (
    select string_agg(t.lexeme, ' | ') as or_query
    from unnest(to_tsvector('english', coalesce(p_query, ''))) as t
  ),
  q as (
    select nullif(trim(or_query), '') as or_query from q_lex
  )
  select
    c.id as chunk_id,
    ts_rank_cd(c.content_tsv, to_tsquery('english', (select or_query from q)))::real as text_score,
    c.created_at
  from public.rag_chunks c
  cross join q
  where c.collection_id = p_collection_id
    and (select or_query from q) is not null
    and c.content_tsv @@ to_tsquery('english', (select or_query from q))
  order by text_score desc
  limit p_k;
$$;
