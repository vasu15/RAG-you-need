import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runHybridSearch } from '@/lib/hybridSearch';

const schema = z.object({
  collectionId: z.string().uuid(),
  query: z.string().min(1),
  debug: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const payload = await runHybridSearch(parsed.data.collectionId, parsed.data.query, parsed.data.debug);
  return NextResponse.json(payload);
}
