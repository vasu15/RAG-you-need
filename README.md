# Hybrid RAG Web App (Next.js + Supabase)

## Setup

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `OPENAI_API_KEY` (optional, enables vector embeddings)

## Run

```bash
npm install
npm run dev
```

Apply SQL migration in Supabase:

- `supabase/migrations/001_init.sql`

## QA checklist

1. Create collection in `/collections`
2. Ingest pasted doc in `/ingest`
3. Search in `/chat` returns ranked chunks and citations
4. Change `w_vec` from `0.9` to `0.1` in `/config`, ranking changes
5. Remove `OPENAI_API_KEY` and confirm keyword-only search still returns results
