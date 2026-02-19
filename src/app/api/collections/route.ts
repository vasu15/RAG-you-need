import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';

const createSchema = z.object({ name: z.string().min(1), description: z.string().optional().default('') });

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('rag_collections').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collections: data ?? [] });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase.from('rag_collections').insert(parsed.data).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collection: data });
}
