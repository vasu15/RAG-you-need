import { createServerClient } from '@/lib/supabase';
import { getEmbeddingProvider } from '@/lib/embeddings';

export type RagConfig = {
  collection_id: string;
  w_vec: number;
  w_text: number;
  top_k: number;
  vec_candidates: number;
  text_candidates: number;
  recency_boost: boolean;
  recency_lambda: number;
  min_score: number;
  updated_at: string;
};

type VectorCandidate = { chunk_id: string; vec_sim: number; created_at: string };
type TextCandidate = { chunk_id: string; text_score: number; created_at: string };

type Ranked = {
  chunkId: string;
  finalScore: number;
  vecScoreNorm: number;
  textScoreNorm: number;
  createdAt: string;
};

export async function getOrCreateConfig(collectionId: string): Promise<RagConfig> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('rag_configs')
    .select('*')
    .eq('collection_id', collectionId)
    .maybeSingle();

  if (data) return data as RagConfig;

  const { data: inserted, error } = await supabase
    .from('rag_configs')
    .insert({ collection_id: collectionId })
    .select('*')
    .single();

  if (error || !inserted) throw new Error(error?.message ?? 'Failed to initialize config');
  return inserted as RagConfig;
}

const minMaxNormalize = (value: number | undefined, min: number, max: number): number => {
  if (value === undefined) return 0;
  const range = max - min;
  if (range <= 0) return 0;
  return (value - min) / range;
};

export async function runHybridSearch(collectionId: string, query: string, debug = false) {
  const supabase = createServerClient();
  const config = await getOrCreateConfig(collectionId);

  const provider = getEmbeddingProvider();
  let embeddingAvailable = false;
  let vectorRows: VectorCandidate[] = [];

  const textPromise = supabase.rpc('rag_text_candidates', {
    p_collection_id: collectionId,
    p_query: query,
    p_k: config.text_candidates,
  });

  if (provider) {
    try {
      const [queryEmbedding] = await provider.embed([query]);
      embeddingAvailable = true;
      const { data: vData } = await supabase.rpc('rag_vector_candidates', {
        p_collection_id: collectionId,
        p_query_embedding: queryEmbedding,
        p_k: config.vec_candidates,
      });
      vectorRows = (vData ?? []) as VectorCandidate[];
    } catch {
      embeddingAvailable = false;
    }
  }

  const { data: textData } = await textPromise;
  const textRows = (textData ?? []) as TextCandidate[];

  const vecScores = vectorRows.map((v) => v.vec_sim);
  const txtScores = textRows.map((t) => t.text_score);
  const vecMin = vecScores.length ? Math.min(...vecScores) : 0;
  const vecMax = vecScores.length ? Math.max(...vecScores) : 0;
  const txtMin = txtScores.length ? Math.min(...txtScores) : 0;
  const txtMax = txtScores.length ? Math.max(...txtScores) : 0;

  const merged = new Map<string, { vec?: VectorCandidate; text?: TextCandidate; created_at: string }>();
  for (const row of vectorRows) merged.set(row.chunk_id, { vec: row, created_at: row.created_at });
  for (const row of textRows) {
    const existing = merged.get(row.chunk_id);
    merged.set(row.chunk_id, { vec: existing?.vec, text: row, created_at: existing?.created_at ?? row.created_at });
  }

  const now = Date.now();
  const ranked: Ranked[] = Array.from(merged.entries()).map(([chunkId, row]) => {
    const vecScoreNorm = minMaxNormalize(row.vec?.vec_sim, vecMin, vecMax);
    const textScoreNorm = minMaxNormalize(row.text?.text_score, txtMin, txtMax);
    let finalScore = config.w_vec * vecScoreNorm + config.w_text * textScoreNorm;

    if (config.recency_boost) {
      const ageDays = Math.max(0, (now - new Date(row.created_at).getTime()) / 86400000);
      const recency = Math.exp(-config.recency_lambda * ageDays);
      finalScore *= 1 + 0.1 * recency;
    }

    return { chunkId, finalScore, vecScoreNorm, textScoreNorm, createdAt: row.created_at };
  });

  ranked.sort((a, b) => b.finalScore - a.finalScore);
  const top = ranked.slice(0, config.top_k);
  const chunkIds = top.map((r) => r.chunkId);

  let detailRows: any[] = [];
  if (chunkIds.length) {
    const { data } = await supabase
      .from('rag_chunks')
      .select('id, content, meta, created_at, rag_documents(title, source_ref)')
      .in('id', chunkIds);
    detailRows = data ?? [];
  }

  const detailsMap = new Map(detailRows.map((row) => [row.id as string, row]));
  const results = top.map((row) => {
    const detail = detailsMap.get(row.chunkId);
    const document = Array.isArray(detail?.rag_documents) ? detail.rag_documents[0] : detail?.rag_documents;
    return {
      chunkId: row.chunkId,
      finalScore: row.finalScore,
      vecScoreNorm: row.vecScoreNorm,
      textScoreNorm: row.textScoreNorm,
      content: detail?.content ?? '',
      meta: detail?.meta ?? {},
      document: {
        title: document?.title ?? 'Unknown',
        sourceRef: document?.source_ref ?? null,
      },
    };
  });

  return {
    results,
    insufficientEvidence: (results[0]?.finalScore ?? 0) < config.min_score,
    ...(debug
      ? {
          debug: {
            config,
            embeddingAvailable,
            counts: { vec: vectorRows.length, text: textRows.length, merged: merged.size },
            rawRanges: { vecMin, vecMax, txtMin, txtMax },
          },
        }
      : {}),
  };
}
