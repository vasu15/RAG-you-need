import * as fs from 'fs';
import * as path from 'path';
import type { RewriteResult } from './types';

const DEFAULT_LOG_PATH = 'logs/rewrites.jsonl';

export function logRewrite(sessionId: string, result: RewriteResult): void {
  try {
    const logPath = process.env.REWRITE_LOG_PATH || DEFAULT_LOG_PATH;
    const dir = path.dirname(logPath);
    if (dir) fs.mkdirSync(dir, { recursive: true });
    const record = {
      ts: new Date().toISOString(),
      session_id: sessionId,
      original: result.original,
      rewritten: result.rewritten,
      was_rewritten: result.was_rewritten,
      ...(result.model != null && { model: result.model }),
      ...(result.latency_ms != null && { latency_ms: result.latency_ms }),
    };
    fs.appendFileSync(logPath, JSON.stringify(record) + '\n');
  } catch (_) {
    // Logging must never crash the app
  }
}
