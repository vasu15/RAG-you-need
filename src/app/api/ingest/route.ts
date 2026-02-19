import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { chunkText } from '@/lib/chunking';
import { getEmbeddingProvider } from '@/lib/embeddings';

const schema = z.object({
  collectionId: z.string().uuid(),
  title: z.string().min(1),
  sourceType: z.literal('paste'),
  text: z.string().min(20),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createServerClient();
  const { collectionId, title, sourceType, text } = parsed.data;

  const { data: document, error: docError } = await supabase.from('rag_documents').insert({
    collection_id: collectionId,
    title,
    source_type: sourceType,
    source_ref: 'pasted-text',
    content_hash: createHash('sha256').update(text).digest('hex'),
  }).select('id').single();

  if (docError || !document) return NextResponse.json({ error: docError?.message ?? 'Failed to insert document' }, { status: 500 });

  const chunks = chunkText(text);
  const chunkRows = chunks.map((chunk, index) => ({
    document_id: document.id,
    collection_id: collectionId,
    chunk_index: index,
    content: chunk.content,
    token_count: chunk.tokenCount,
    meta: chunk.meta,
  }));

  const { data: insertedChunks, error: chunkError } = await supabase.from('rag_chunks').insert(chunkRows).select('id, content');
  if (chunkError || !insertedChunks) return NextResponse.json({ error: chunkError?.message ?? 'Failed to insert chunks' }, { status: 500 });

  const provider = getEmbeddingProvider();
  if (provider) {
    try {
      const vectors = await provider.embed(insertedChunks.map((c) => c.content));
      const embeddingRows = insertedChunks.map((chunk, i) => ({
        chunk_id: chunk.id,
        collection_id: collectionId,
        embedding: vectors[i],
      }));
      await supabase.from('rag_embeddings').insert(embeddingRows);
    } catch {
      // graceful degradation: skip vector insert
    }
  }

  return NextResponse.json({ docId: document.id, chunkCount: insertedChunks.length });
}
