import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runHybridSearch, getOrCreateConfig } from '@/lib/hybridSearch';

const schema = z.object({
  collectionId: z.string().uuid(),
  query: z.string().min(3),
  debug: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    // Get search results
    const result = await runHybridSearch(parsed.data.collectionId, parsed.data.query, parsed.data.debug);
    const top = result.results.slice(0, 5); // Use top 5 for context

    if (top.length === 0) {
      return NextResponse.json({
        answer: 'I couldn\'t find any relevant information in the documents to answer your question.',
        citations: [],
        search: result,
      });
    }

    // Get config for system prompt
    const config = await getOrCreateConfig(parsed.data.collectionId);
    const systemPrompt = (config as any).system_prompt || 'You are a helpful AI assistant. Answer based on the provided context.';
    const model = (config as any).model || 'gpt-3.5-turbo';

    // Build context from top results
    const context = top.map((r, idx) => 
      `[Source ${idx + 1}: ${r.document.title}]\n${r.content}`
    ).join('\n\n');

    // Call OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      // Fallback to simple concatenation if no OpenAI key
      const answer = `Based on the documents:\n\n${top[0].content.slice(0, 300)}...`;
      return NextResponse.json({
        answer,
        citations: top.map((r) => ({
          title: r.document.title,
          chunkId: r.chunkId,
          snippet: r.content.slice(0, 150),
        })),
        search: result,
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Context from documents:\n\n${context}\n\nQuestion: ${parsed.data.query}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'Failed to generate answer.';

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
    return NextResponse.json({
      error: error.message || 'Failed to generate answer',
    }, { status: 500 });
  }
}
