export interface RewriteResult {
  original: string;
  rewritten: string;
  was_rewritten: boolean;
  model?: string;
  latency_ms?: number;
}
