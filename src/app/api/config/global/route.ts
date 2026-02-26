import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const ROW_ID = 'default';

export type GlobalSettings = {
  global_system_prompt: string | null;
  apply_personality_to_all: boolean;
  updated_at: string;
};

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('rag_global_settings')
      .select('global_system_prompt, apply_personality_to_all, updated_at')
      .eq('id', ROW_ID)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const settings: GlobalSettings = data
      ? {
          global_system_prompt: data.global_system_prompt ?? null,
          apply_personality_to_all: data.apply_personality_to_all ?? false,
          updated_at: data.updated_at,
        }
      : {
          global_system_prompt: null,
          apply_personality_to_all: false,
          updated_at: new Date().toISOString(),
        };

    return NextResponse.json({ settings });
  } catch (err: any) {
    console.error('Global settings GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const global_system_prompt =
      body.global_system_prompt !== undefined ? (body.global_system_prompt === '' ? null : body.global_system_prompt) : undefined;
    const apply_personality_to_all =
      body.apply_personality_to_all !== undefined ? Boolean(body.apply_personality_to_all) : undefined;

    const supabase = createServerClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (global_system_prompt !== undefined) updates.global_system_prompt = global_system_prompt;
    if (apply_personality_to_all !== undefined) updates.apply_personality_to_all = apply_personality_to_all;

    const { data, error } = await supabase
      .from('rag_global_settings')
      .upsert({ id: ROW_ID, ...updates }, { onConflict: 'id' })
      .select('global_system_prompt, apply_personality_to_all, updated_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      settings: {
        global_system_prompt: data?.global_system_prompt ?? null,
        apply_personality_to_all: data?.apply_personality_to_all ?? false,
        updated_at: data?.updated_at,
      },
    });
  } catch (err: any) {
    console.error('Global settings PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
