const ASSISTANT_TRUNCATE_CHARS = 150;

export type Message = { role: 'user' | 'assistant'; content: string };

/**
 * Format message history for the rewriter prompt. Takes the last N turns
 * (pairs of user + assistant), truncates each assistant message to 150 chars,
 * and returns a single string like:
 * "User: ...\nAssistant: ...\nUser: ..."
 */
export function formatHistoryForRewriter(
  messages: Message[],
  lastN: number = 3
): string {
  if (messages.length === 0) return '';

  // One turn = one user message + optional following assistant message. Take last 2*lastN messages.
  const maxMessages = lastN * 2;
  const slice = messages.slice(-maxMessages);

  return slice
    .map((m) => {
      if (m.role === 'assistant') {
        const content =
          m.content.length > ASSISTANT_TRUNCATE_CHARS
            ? m.content.slice(0, ASSISTANT_TRUNCATE_CHARS) + '...'
            : m.content;
        return `Assistant: ${content}`;
      }
      return `User: ${m.content}`;
    })
    .join('\n');
}
