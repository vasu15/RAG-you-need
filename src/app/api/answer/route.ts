import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runHybridSearch, getOrCreateConfig } from '@/lib/hybridSearch';
import { rewrite } from '@/lib/rewriter/queryRewriter';
import { logRewrite } from '@/lib/rewriter/logger';

const schema = z.object({
  collectionId: z.string().uuid(),
  query: z.string().min(1),
  debug: z.boolean().optional().default(false),
  previousMessages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .optional()
    .default([]),
});


export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { collectionId, query, debug, previousMessages } = parsed.data;

    // Cap conversation history to avoid token overflow (last 10 messages = 5 exchanges)
    const MAX_HISTORY_MESSAGES = 10;
    const history = previousMessages.slice(-MAX_HISTORY_MESSAGES);

    // LLM query rewriter: turn follow-ups into standalone search queries before retrieval
    const rewriteResult = await rewrite({ currentQuery: query, previousMessages: history });
    logRewrite(collectionId, rewriteResult);

    const lastUserMessage = [...history].reverse().find((m) => m.role === 'user')?.content?.trim();
    const retrievalQuery =
      rewriteResult.was_rewritten
        ? rewriteResult.rewritten
        : lastUserMessage && lastUserMessage.length > 0
          ? `${lastUserMessage} ${query}`.trim()
          : query;
    if (retrievalQuery !== query) {
      console.log(`[RETRIEVAL] Using conversation-expanded query: "${retrievalQuery.slice(0, 80)}${retrievalQuery.length > 80 ? '...' : ''}"`);
    }

    console.log(`\n[ANSWER REQUEST] collectionId=${collectionId} query="${query}" history=${history.length} messages`);

    // Run hybrid search (with debug info so we can return it alongside the answer)
    const result = await runHybridSearch(collectionId, retrievalQuery, debug);
    let top = result.results.slice(0, 5);

    // When retrieval was expanded with the previous user message, ensure the chunk that answered
    // that message is Source 1 for the follow-up. Otherwise a generic chunk can rank first and
    // the model answers about the wrong product (e.g. NSDL instead of IndusInd Zinger).
    if (lastUserMessage && retrievalQuery !== query && top.length > 1) {
      const prevResult = await runHybridSearch(collectionId, lastUserMessage, false);
      const prevChunkId = prevResult.results[0]?.chunkId;
      if (prevChunkId) {
        const idx = top.findIndex((r) => r.chunkId === prevChunkId);
        if (idx > 0) {
          const [prevChunk] = top.splice(idx, 1);
          top = [prevChunk, ...top];
          result.results = [...top, ...result.results.filter((r) => !top.some((t) => t.chunkId === r.chunkId))];
          console.log(`[RETRIEVAL] Prioritized previous-turn chunk as Source 1: ${prevChunkId}`);
        }
      }
    }

    if (top.length === 0) {
      console.warn(`[ANSWER] No results found for collectionId=${collectionId} — collection may be empty or wrong ID`);
      return NextResponse.json({
        answer: "I couldn't find any relevant information in the documents to answer your question.",
        citations: [],
        search: result,
      });
    }

    // Get config for system prompt + model
    const config = await getOrCreateConfig(collectionId);
    const { createServerClient } = await import('@/lib/supabase');
    const supabase = createServerClient();
    const { data: globalRow } = await supabase
      .from('rag_global_settings')
      .select('global_system_prompt, apply_personality_to_all')
      .eq('id', 'default')
      .maybeSingle();
    const useGlobal =
      globalRow?.apply_personality_to_all === true &&
      globalRow?.global_system_prompt != null &&
      String(globalRow.global_system_prompt).trim().length > 0;
    const defaultPrompt =
      'You are a RAG assistant. You receive a question and a retrieved context. Answer using that context. When the context clearly contains the answer, give a direct answer. When the context is ambiguous or supports multiple interpretations, ask a targeted question so you can give a clear answer. When the context does not contain relevant information, say so.';
    const systemPrompt = useGlobal
      ? String(globalRow!.global_system_prompt).trim()
      : (config as any).system_prompt || defaultPrompt;
    const model = (config as any).model || 'gpt-3.5-turbo';

    // Build context from top-ranked chunks. Task framing makes the LLM's role explicit
    // (answer from this context; if relevant, answer directly) without hardcoding responses.
    const context = top
      .map((r, idx) => `[Source ${idx + 1}: ${r.document.title}]\n${r.content}`)
      .join('\n\n');

    const userMessage = `Answer the following question using only the context below. Sources are ordered by relevance (Source 1 is most relevant).

Context from documents:

${context}

Question: ${query}`;

    // Build messages for LLM: system + conversation history + current turn (with RAG context)
    const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userMessage },
    ];

    // ── LLM Payload Log ──────────────────────────────────────────────────────
    console.log(`\n[LLM PAYLOAD] Configured model: ${model}`);
    console.log(`  System prompt: "${systemPrompt.slice(0, 120)}${systemPrompt.length > 120 ? '...' : ''}"`);
    console.log(`  User query: "${query}"`);
    console.log(`  Context chunks sent (${top.length}):`);
    top.forEach((r, i) => {
      console.log(`    [Source ${i + 1}] ${r.document.title} (score=${r.finalScore.toFixed(4)})`);
      console.log(`      "${r.content.slice(0, 120).replace(/\n/g, ' ')}${r.content.length > 120 ? '...' : ''}"`);
    });
    console.log(`  Total context length: ${context.length} chars`);

    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let answer = '';

    // ── Try OpenAI ────────────────────────────────────────────────────────────
    if (openaiKey) {
      console.log('[LLM] Trying OpenAI...');
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: openaiMessages,
            temperature: 0.25,
            max_tokens: 500,
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`[LLM] OpenAI failed (${res.status} ${res.statusText}): ${errBody.slice(0, 200)}`);
        } else {
          const data = await res.json();
          answer = data.choices?.[0]?.message?.content || '';
          console.log('[LLM] OpenAI responded successfully');
        }
      } catch (err: any) {
        console.warn(`[LLM] OpenAI request error: ${err.message}`);
      }
    } else {
      console.log('[LLM] No OPENAI_API_KEY found, skipping OpenAI');
    }

    // ── Fall back to Anthropic ────────────────────────────────────────────────
    if (!answer && anthropicKey) {
      console.log('[LLM] Falling back to Anthropic Claude...');
      try {
        // Use claude-3-5-haiku (fast + cheap) unless the config explicitly picks a claude model
        const claudeModel = model.startsWith('claude') ? model : 'claude-3-5-haiku-20241022';
        console.log(`[LLM] Anthropic model: ${claudeModel}`);

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: claudeModel,
            max_tokens: 500,
            temperature: 0.25,
            system: systemPrompt,
            messages: [
              ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
              { role: 'user' as const, content: userMessage },
            ],
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`[LLM] Anthropic failed (${res.status} ${res.statusText}): ${errBody.slice(0, 200)}`);
        } else {
          const data = await res.json();
          answer = data.content?.[0]?.text || '';
          console.log('[LLM] Anthropic responded successfully');
        }
      } catch (err: any) {
        console.warn(`[LLM] Anthropic request error: ${err.message}`);
      }
    }

    // ── No LLM available ─────────────────────────────────────────────────────
    if (!answer) {
      if (!openaiKey && !anthropicKey) {
        console.warn('[LLM] No API keys configured — returning raw chunk content');
      } else {
        console.warn('[LLM] All providers failed — returning raw chunk content');
      }
      answer = `Based on the documents:\n\n${top[0].content.slice(0, 500)}`;
    }

    console.log(`\n[LLM RESPONSE] "${answer.slice(0, 200)}${answer.length > 200 ? '...' : ''}"`);

    return NextResponse.json({
      answer,
      citations: top.map((r) => ({
        title: r.document.title,
        chunkId: r.chunkId,
        documentId: r.document.id,
        snippet: r.content.slice(0, 150),
        score: r.finalScore,
      })),
      search: result,
    });
  } catch (error: any) {
    console.error('Answer generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate answer' },
      { status: 500 }
    );
  }
}
