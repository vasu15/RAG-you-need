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

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo);
}

/**
 * Robust normalization: clips to [p05, p95] before min-max scaling.
 * Prevents a single outlier from collapsing all other scores near zero.
 */
function robustNormalize(values: number[], pLow = 0.05, pHigh = 0.95): number[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const lo = percentile(sorted, pLow);
  const hi = percentile(sorted, pHigh);
  const range = hi - lo;

  if (!Number.isFinite(range) || range < 1e-12) {
    // p05–p95 range collapsed (e.g. most values are zero with 1–2 outliers).
    // Fall back to plain min-max so multiple distinct positive values still
    // get properly ranked rather than all collapsing to 1.0.
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const fullRange = max - min;
    if (fullRange < 1e-12) {
      // Truly all identical — positive → 1, zero → 0
      return values.map((v) => (v > 0 ? 1 : 0));
    }
    return values.map((v) => clamp01((v - min) / fullRange));
  }

  return values.map((v) => clamp01((Math.min(Math.max(v, lo), hi) - lo) / range));
}

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
  let textRows = (textData ?? []) as TextCandidate[];

  // If strict BM25 (AND of all query terms) returns nothing, retry with relaxed (OR of terms)
  // so queries like "how and when my points are credited" still match HPPL FAQ chunks.
  let textSearchRelaxed = false;
  if (textRows.length === 0) {
    const { data: relaxedData } = await supabase.rpc('rag_text_candidates_relaxed', {
      p_collection_id: collectionId,
      p_query: query,
      p_k: config.text_candidates,
    });
    const relaxed = (relaxedData ?? []) as TextCandidate[];
    if (relaxed.length > 0) {
      textRows = relaxed;
      textSearchRelaxed = true;
    }
  }

  // ── Semantic Search Results ─────────────────────────────────────────────────
  console.log(`\n[SEMANTIC SEARCH] ${vectorRows.length} candidates returned (embedding available: ${embeddingAvailable})`);
  if (vectorRows.length > 0) {
    vectorRows.slice(0, 10).forEach((v, i) => {
      console.log(`  [${i + 1}] chunk_id=${v.chunk_id}  vec_sim=${v.vec_sim.toFixed(4)}`);
    });
    if (vectorRows.length > 10) console.log(`  ... and ${vectorRows.length - 10} more`);
  }

  // ── BM25 / Keyword Search Results ──────────────────────────────────────────
  console.log(`\n[BM25 KEYWORD SEARCH] ${textRows.length} candidates returned${textSearchRelaxed ? ' (relaxed OR query)' : ''}`);
  if (textRows.length > 0) {
    textRows.slice(0, 10).forEach((t, i) => {
      console.log(`  [${i + 1}] chunk_id=${t.chunk_id}  text_score=${t.text_score.toFixed(4)}`);
    });
    if (textRows.length > 10) console.log(`  ... and ${textRows.length - 10} more`);
  }

  const merged = new Map<string, { vec?: VectorCandidate; text?: TextCandidate; created_at: string }>();
  for (const row of vectorRows) merged.set(row.chunk_id, { vec: row, created_at: row.created_at });
  for (const row of textRows) {
    const existing = merged.get(row.chunk_id);
    merged.set(row.chunk_id, { vec: existing?.vec, text: row, created_at: existing?.created_at ?? row.created_at });
  }

  const candidates = Array.from(merged.entries());

  // Change 1: Robust normalization — clips to [p05, p95] before scaling so a
  // single outlier cannot collapse all other scores near zero.
  const vecNorms  = robustNormalize(candidates.map(([, row]) => row.vec?.vec_sim   ?? 0));
  const textNorms = robustNormalize(candidates.map(([, row]) => row.text?.text_score ?? 0));

  // Change 2: Weight normalization — divide by weightSum so scores stay in
  // [0, 1] even if the config weights don't happen to sum to 1.
  const weightSum = config.w_vec + config.w_text;
  const wv = weightSum > 0 ? config.w_vec  / weightSum : 0.5;
  const wt = weightSum > 0 ? config.w_text / weightSum : 0.5;

  const now = Date.now();
  const ranked: Ranked[] = candidates.map(([chunkId, row], i) => {
    const vecScoreNorm  = vecNorms[i]  ?? 0;
    const textScoreNorm = textNorms[i] ?? 0;
    let finalScore = wv * vecScoreNorm + wt * textScoreNorm;

    if (config.recency_boost) {
      const ageDays = Math.max(0, (now - new Date(row.created_at).getTime()) / 86400000);
      const recency = Math.exp(-config.recency_lambda * ageDays);
      // Change 3: Explicit maxBoost constant (replaces hardcoded 0.1).
      const maxBoost = 0.1;
      finalScore *= 1 + maxBoost * recency;
    }

    return { chunkId, finalScore, vecScoreNorm, textScoreNorm, createdAt: row.created_at };
  });

  ranked.sort((a, b) => b.finalScore - a.finalScore);
  const top = ranked.slice(0, config.top_k);

  // ── Hybrid Merged + Ranked Results ─────────────────────────────────────────
  console.log(`\n[HYBRID MERGE] ${ranked.length} unique chunks merged → top ${top.length} selected (weights: vec=${config.w_vec}, text=${config.w_text})`);
  top.forEach((r, i) => {
    console.log(
      `  [${i + 1}] chunk_id=${r.chunkId}  final=${r.finalScore.toFixed(4)}  vec_norm=${r.vecScoreNorm.toFixed(4)}  text_norm=${r.textScoreNorm.toFixed(4)}`
    );
  });

  const chunkIds = top.map((r) => r.chunkId);

  let detailRows: any[] = [];
  if (chunkIds.length) {
    const { data } = await supabase
      .from('rag_chunks')
      .select('id, content, meta, created_at, document_id, rag_documents(id, title, source_ref)')
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
        id: document?.id ?? null,
        title: document?.title ?? 'Unknown',
        sourceRef: document?.source_ref ?? null,
      },
    };
  });

  // Build debug info with detailed candidate lists
  let debugInfo: any = {};
  if (debug) {
    // Get details for vector candidates
    let vectorCandidatesWithDetails: any[] = [];
    if (vectorRows.length > 0) {
      const vecIds = vectorRows.map(v => v.chunk_id);
      const { data: vecDetails } = await supabase
        .from('rag_chunks')
        .select('id, content, rag_documents(title)')
        .in('id', vecIds);
      
      const vecDetailsMap = new Map((vecDetails || []).map(d => [d.id, d]));
      vectorCandidatesWithDetails = vectorRows.map(v => {
        const detail = vecDetailsMap.get(v.chunk_id);
        const doc = Array.isArray(detail?.rag_documents) ? detail.rag_documents[0] : detail?.rag_documents;
        return {
          chunkId: v.chunk_id,
          score: v.vec_sim,
          content: detail?.content?.slice(0, 200) || '',
          title: doc?.title || 'Unknown',
        };
      });
    }

    // Get details for text candidates
    let textCandidatesWithDetails: any[] = [];
    if (textRows.length > 0) {
      const txtIds = textRows.map(t => t.chunk_id);
      const { data: txtDetails } = await supabase
        .from('rag_chunks')
        .select('id, content, rag_documents(title)')
        .in('id', txtIds);
      
      const txtDetailsMap = new Map((txtDetails || []).map(d => [d.id, d]));
      textCandidatesWithDetails = textRows.map(t => {
        const detail = txtDetailsMap.get(t.chunk_id);
        const doc = Array.isArray(detail?.rag_documents) ? detail.rag_documents[0] : detail?.rag_documents;
        return {
          chunkId: t.chunk_id,
          score: t.text_score,
          content: detail?.content?.slice(0, 200) || '',
          title: doc?.title || 'Unknown',
        };
      });
    }

    debugInfo = {
      config,
      embeddingAvailable,
      textSearchRelaxed,
      counts: { vec: vectorRows.length, text: textRows.length, merged: merged.size },
      vectorCandidates: vectorCandidatesWithDetails,
      textCandidates: textCandidatesWithDetails,
    };
  }

  return {
    results,
    insufficientEvidence: (results[0]?.finalScore ?? 0) < config.min_score,
    ...(debug ? { debug: debugInfo } : {}),
  };
}
