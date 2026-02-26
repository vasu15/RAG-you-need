import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get('collectionId');

  if (!collectionId) {
    return NextResponse.json({ error: 'collectionId is required' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    const { data: documents, error } = await supabase
      .from('rag_documents')
      .select('id, title, source_type, source_ref, created_at')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get chunk counts per document in one query
    const { data: chunkCounts } = await supabase
      .from('rag_chunks')
      .select('document_id')
      .eq('collection_id', collectionId);

    const countMap = new Map<string, number>();
    for (const row of chunkCounts ?? []) {
      countMap.set(row.document_id, (countMap.get(row.document_id) ?? 0) + 1);
    }

    // Get embedding counts per document
    const { data: embCounts } = await supabase
      .from('rag_embeddings')
      .select('chunk_id, rag_chunks!inner(document_id)')
      .eq('collection_id', collectionId);

    const embMap = new Map<string, number>();
    for (const row of embCounts ?? []) {
      const docId = Array.isArray((row as any).rag_chunks)
        ? (row as any).rag_chunks[0]?.document_id
        : (row as any).rag_chunks?.document_id;
      if (docId) embMap.set(docId, (embMap.get(docId) ?? 0) + 1);
    }

    const enriched = (documents ?? []).map((doc) => ({
      ...doc,
      chunkCount: countMap.get(doc.id) ?? 0,
      embeddingCount: embMap.get(doc.id) ?? 0,
    }));

    return NextResponse.json({ documents: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
