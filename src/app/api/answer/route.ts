import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runHybridSearch } from '@/lib/hybridSearch';

const schema = z.object({
  collectionId: z.string().uuid(),
  query: z.string().min(3),
  debug: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await runHybridSearch(parsed.data.collectionId, parsed.data.query, parsed.data.debug);
  const top = result.results.slice(0, 3);
  const answer = top.length
    ? `Based on retrieved chunks: ${top.map((r) => r.content.slice(0, 160)).join(' ')}`
    : 'No relevant evidence found.';

  return NextResponse.json({
    answer,
    citations: top.map((r) => ({
      title: r.document.title,
      chunkId: r.chunkId,
      snippet: r.content.slice(0, 160),
    })),
    search: result,
  });
}
