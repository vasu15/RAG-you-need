import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';

const getSchema = z.object({
  phoneNumber: z.string().min(10),
  collectionId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

const saveSchema = z.object({
  phoneNumber: z.string().min(10),
  collectionId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  sources: z.array(z.object({
    title: z.string(),
    snippet: z.string(),
    score: z.number().optional(),
  })).optional(),
});

const deleteSchema = z.object({
  phoneNumber: z.string().min(10),
  collectionId: z.string().uuid(),
});

// GET - Retrieve conversation history
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phoneNumber = url.searchParams.get('phoneNumber');
    const collectionId = url.searchParams.get('collectionId');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const parsed = getSchema.safeParse({ phoneNumber, collectionId, limit });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get or create user
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_phone_number: parsed.data.phoneNumber,
    });

    if (userError || !userId) {
      return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
    }

    // Get conversation history
    const { data: history, error: historyError } = await supabase.rpc('get_conversation_history', {
      p_user_id: userId,
      p_collection_id: parsed.data.collectionId,
      p_limit: parsed.data.limit,
    });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // Reverse to get chronological order (oldest first)
    const messages = (history || []).reverse();

    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// POST - Save a message to conversation history
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = saveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get or create user
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_phone_number: parsed.data.phoneNumber,
    });

    if (userError || !userId) {
      return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
    }

    // Save message
    const { data: message, error: messageError } = await supabase
      .from('rag_conversations')
      .insert({
        user_id: userId,
        collection_id: parsed.data.collectionId,
        role: parsed.data.role,
        content: parsed.data.content,
        sources: parsed.data.sources || null,
      })
      .select('id, role, content, sources, created_at')
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// DELETE - Clear conversation history for a user
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const phoneNumber = url.searchParams.get('phoneNumber');
    const collectionId = url.searchParams.get('collectionId');

    const parsed = deleteSchema.safeParse({ phoneNumber, collectionId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get user
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_phone_number: parsed.data.phoneNumber,
    });

    if (userError || !userId) {
      return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
    }

    // Delete all messages for this user and collection
    const { error: deleteError } = await supabase
      .from('rag_conversations')
      .delete()
      .eq('user_id', userId)
      .eq('collection_id', parsed.data.collectionId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
