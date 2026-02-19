import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET document by ID with full content
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, title, source_type, source_ref, created_at')
      .eq('id', params.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get all chunks for this document (ordered by chunk_index)
    const { data: chunks, error: chunksError } = await supabase
      .from('rag_chunks')
      .select('id, chunk_index, content, meta')
      .eq('document_id', params.id)
      .order('chunk_index', { ascending: true });

    if (chunksError) {
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }

    // Reconstruct full document
    const fullContent = (chunks || []).map(c => c.content).join('\n\n');
    
    return NextResponse.json({
      document: {
        ...document,
        fullContent,
        chunks: chunks || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
