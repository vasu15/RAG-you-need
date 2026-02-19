import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET - List prompt templates
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: templates, error } = await supabase
      .from('rag_prompt_templates')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
