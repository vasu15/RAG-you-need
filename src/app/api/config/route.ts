import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { getOrCreateConfig } from '@/lib/hybridSearch';

const querySchema = z.object({ collectionId: z.string().uuid() });
const updateSchema = z.object({
  collectionId: z.string().uuid(),
  w_vec: z.number().min(0).max(1),
  w_text: z.number().min(0).max(1),
  top_k: z.number().int().min(1).max(50),
  vec_candidates: z.number().int().min(1).max(200).optional(),
  text_candidates: z.number().int().min(1).max(200).optional(),
  recency_boost: z.boolean(),
  recency_lambda: z.number().min(0),
  min_score: z.number().min(0),
  system_prompt: z.string().optional(),
  model: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const parsed = querySchema.safeParse({ 
      collectionId: new URL(req.url).searchParams.get('collectionId') 
    });
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    
    const config = await getOrCreateConfig(parsed.data.collectionId);
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Config GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createServerClient();
    const { collectionId, ...rest } = parsed.data;
    
    const { data, error } = await supabase
      .from('rag_configs')
      .upsert({
        collection_id: collectionId,
        ...rest,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Config PUT error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ config: data });
  } catch (error: any) {
    console.error('Config PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
