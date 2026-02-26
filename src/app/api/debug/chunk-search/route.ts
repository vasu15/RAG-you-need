import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * Debug: see which chunks contain which terms (e.g. "points", "credited").
 * Use to verify if both words appear in the same chunk or in different chunks.
 *
 * GET /api/debug/chunk-search?collectionId=...&terms=points,credited
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get('collectionId');
  const termsParam = searchParams.get('terms') ?? 'points,credited';
  const terms = termsParam.split(',').map((t) => t.trim()).filter(Boolean);

  if (!collectionId || terms.length === 0) {
    return NextResponse.json(
      { error: 'collectionId and at least one term required. Example: ?collectionId=xxx&terms=points,credited' },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    const { data: chunks, error } = await supabase
      .from('rag_chunks')
      .select('id, content, chunk_index, document_id, rag_documents(id, title)')
      .eq('collection_id', collectionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const list = (chunks ?? []) as Array<{
      id: string;
      content: string;
      chunk_index: number;
      document_id: string;
      rag_documents: { id: string; title: string } | Array<{ id: string; title: string }>;
    }>;

    const byTerm: Record<string, Array<{ chunkId: string; title: string; chunkIndex: number; snippet: string }>> = {};
    for (const term of terms) {
      byTerm[term] = [];
    }

    const chunksWithAll: Array<{ chunkId: string; title: string; chunkIndex: number }> = [];

    for (const c of list) {
      const title = Array.isArray(c.rag_documents) ? c.rag_documents[0]?.title : c.rag_documents?.title;
      const titleStr = title ?? 'Unknown';
      const contentLower = (c.content ?? '').toLowerCase();

      let hasAll = true;
      for (const term of terms) {
        const has = contentLower.includes(term.toLowerCase());
        if (has) {
          const snippet = getSnippet(c.content, term, 60);
          byTerm[term].push({ chunkId: c.id, title: titleStr, chunkIndex: c.chunk_index, snippet });
        } else {
          hasAll = false;
        }
      }
      if (hasAll) {
        chunksWithAll.push({ chunkId: c.id, title: titleStr, chunkIndex: c.chunk_index });
      }
    }

    return NextResponse.json({
      collectionId,
      terms,
      byTerm,
      chunksContainingAllTerms: chunksWithAll,
      summary: {
        chunksWithAllCount: chunksWithAll.length,
        perTerm: Object.fromEntries(terms.map((t) => [t, byTerm[t].length])),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

function getSnippet(content: string, term: string, contextChars: number): string {
  if (!content) return '';
  const lower = content.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx < 0) return content.slice(0, 80) + '...';
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(content.length, idx + term.length + contextChars);
  return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
}
