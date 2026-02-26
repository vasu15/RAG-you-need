import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { getEmbeddingProvider } from '@/lib/embeddings';

const schema = z.object({
  collectionId: z.string().uuid(),
});

const BATCH_SIZE = 20;

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { collectionId } = parsed.data;

  const provider = getEmbeddingProvider();
  if (!provider) {
    return NextResponse.json({ error: 'No OPENAI_API_KEY configured — cannot generate embeddings' }, { status: 400 });
  }

  const supabase = createServerClient();

  // All chunks for this collection
  const { data: allChunks, error: chunksError } = await supabase
    .from('rag_chunks')
    .select('id, content')
    .eq('collection_id', collectionId);

  if (chunksError) return NextResponse.json({ error: chunksError.message }, { status: 500 });

  // Chunk IDs that already have embeddings
  const { data: existing } = await supabase
    .from('rag_embeddings')
    .select('chunk_id')
    .eq('collection_id', collectionId);

  const existingIds = new Set((existing ?? []).map((e) => e.chunk_id));
  const pending = (allChunks ?? []).filter((c) => !existingIds.has(c.id));

  console.log(`[BACKFILL] collection=${collectionId}  total=${allChunks?.length ?? 0}  already embedded=${existingIds.size}  pending=${pending.length}`);

  if (pending.length === 0) {
    return NextResponse.json({
      message: 'All chunks already have embeddings — nothing to do',
      generated: 0,
      total: allChunks?.length ?? 0,
      skipped: existingIds.size,
    });
  }

  let generated = 0;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const vectors = await provider.embed(batch.map((c) => c.content));
    const rows = batch.map((chunk, idx) => ({
      chunk_id: chunk.id,
      collection_id: collectionId,
      embedding: vectors[idx],
    }));
    await supabase.from('rag_embeddings').insert(rows);
    generated += batch.length;
    console.log(`[BACKFILL] Progress: ${generated}/${pending.length}`);
  }

  console.log(`[BACKFILL] Done — generated ${generated} embeddings`);

  return NextResponse.json({
    message: `Generated embeddings for ${generated} chunks`,
    generated,
    total: allChunks?.length ?? 0,
    skipped: existingIds.size,
  });
}
