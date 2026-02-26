import { REWRITER_SYSTEM_PROMPT, buildRewriterMessage } from './prompts';
import { formatHistoryForRewriter } from './formatHistory';
import type { RewriteResult } from './types';

export type Message = { role: 'user' | 'assistant'; content: string };

const REWRITER_MODEL = process.env.REWRITER_MODEL || 'gpt-4o-mini';
const REWRITER_MAX_TOKENS = (() => {
  const n = parseInt(process.env.REWRITER_MAX_TOKENS || '60', 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
})();
const REWRITER_TEMPERATURE = (() => {
  const n = parseFloat(process.env.REWRITER_TEMPERATURE ?? '0');
  return Number.isFinite(n) && n >= 0 ? n : 0;
})();
const REWRITER_HISTORY_TURNS = (() => {
  const n = parseInt(process.env.REWRITER_HISTORY_TURNS || '3', 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
})();

const BAD_STARTS = ['I ', 'Sure', 'Yes', 'No', 'The answer'];
const MAX_REWRITTEN_LENGTH = 200;

function cleanRewritten(raw: string, original: string): string {
  let s = raw.trim();
  if (!s) return original;
  if (s.startsWith('→')) s = s.slice(1).trim();
  const lower = 'Rewritten:';
  if (s.toLowerCase().startsWith(lower)) s = s.slice(lower.length).trim();
  // Strip only matching surrounding quotes (single char each side) to avoid breaking queries containing internal quotes
  if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
    s = s.slice(1, -1).trim();
  }
  if (!s) return original;
  if (s.length > MAX_REWRITTEN_LENGTH) return original;
  const lowerS = s.toLowerCase();
  if (BAD_STARTS.some((b) => lowerS.startsWith(b.toLowerCase()))) return original;
  return s;
}

export async function rewrite(params: {
  currentQuery: string;
  previousMessages: Message[];
}): Promise<RewriteResult> {
  const { currentQuery, previousMessages } = params;
  const original = currentQuery.trim();

  if (previousMessages.length === 0) {
    return { original, rewritten: original, was_rewritten: false };
  }

  const historyStr = formatHistoryForRewriter(previousMessages, REWRITER_HISTORY_TURNS);
  const userMessage = buildRewriterMessage(historyStr, currentQuery);
  const start = Date.now();

  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let raw = '';

    if (openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: REWRITER_MODEL,
            messages: [
              { role: 'system', content: REWRITER_SYSTEM_PROMPT },
              { role: 'user', content: userMessage },
            ],
            temperature: REWRITER_TEMPERATURE,
            max_tokens: REWRITER_MAX_TOKENS,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          raw = data.choices?.[0]?.message?.content ?? '';
        } else {
          let errBody = '';
          if (typeof (res as Response).text === 'function') {
            try {
              errBody = await (res as Response).text();
            } catch {
              errBody = String(res.status);
            }
          } else {
            errBody = String(res.status);
          }
          console.warn(`[REWRITER] OpenAI failed (${res.status}): ${errBody.slice(0, 200)}`);
        }
      } catch (err: any) {
        console.warn(`[REWRITER] OpenAI error: ${err.message}`);
      }
    }

    if (!raw && anthropicKey) {
      try {
        const claudeModel = REWRITER_MODEL.startsWith('claude')
          ? REWRITER_MODEL
          : 'claude-3-5-haiku-20241022';
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: claudeModel,
            max_tokens: REWRITER_MAX_TOKENS,
            temperature: REWRITER_TEMPERATURE,
            system: REWRITER_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          raw = data.content?.[0]?.text ?? '';
        } else {
          let errBody = '';
          if (typeof (res as Response).text === 'function') {
            try {
              errBody = await (res as Response).text();
            } catch {
              errBody = String(res.status);
            }
          } else {
            errBody = String(res.status);
          }
          console.warn(`[REWRITER] Anthropic failed (${res.status}): ${errBody.slice(0, 200)}`);
        }
      } catch (err: any) {
        console.warn(`[REWRITER] Anthropic error: ${err.message}`);
      }
    }

    const latency_ms = Date.now() - start;
    const rewritten = cleanRewritten(raw, original);
    const was_rewritten = original !== rewritten;

    return {
      original,
      rewritten,
      was_rewritten,
      model: REWRITER_MODEL,
      latency_ms,
    };
  } catch (err: any) {
    console.warn(`[REWRITER] Unexpected error: ${err.message}`);
    return { original, rewritten: original, was_rewritten: false };
  }
}
