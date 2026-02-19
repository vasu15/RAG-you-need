-- Add system prompt configuration

alter table public.rag_configs
add column if not exists system_prompt text default 'You are a helpful AI assistant. Answer the user''s question based on the provided context. Be concise and accurate. If the context doesn''t contain relevant information, say so.';

alter table public.rag_configs
add column if not exists model text default 'gpt-3.5-turbo';

-- Create default prompts table for quick selection
create table if not exists public.rag_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  prompt text not null,
  is_default boolean default false,
  created_at timestamptz not null default now()
);

-- Insert some default prompt templates
insert into public.rag_prompt_templates (name, description, prompt, is_default)
values
  (
    'Default Assistant',
    'Helpful, concise, accurate responses',
    'You are a helpful AI assistant. Answer the user''s question based on the provided context. Be concise and accurate. If the context doesn''t contain relevant information, say so.',
    true
  ),
  (
    'Technical Expert',
    'Detailed technical explanations',
    'You are a technical expert. Provide detailed, accurate answers based on the context provided. Include technical terms and explanations. If you need more context, ask clarifying questions.',
    false
  ),
  (
    'Friendly Tutor',
    'Patient, educational responses',
    'You are a friendly tutor. Explain concepts clearly and simply based on the provided context. Use examples and analogies. Break down complex topics into understandable parts.',
    false
  ),
  (
    'Business Analyst',
    'Professional business insights',
    'You are a business analyst. Provide professional, data-driven insights based on the context. Focus on actionable information and business implications.',
    false
  ),
  (
    'Creative Writer',
    'Engaging narrative responses',
    'You are a creative writer. Use the context to craft engaging, well-written responses. Make the information interesting and memorable while staying accurate.',
    false
  )
on conflict do nothing;
