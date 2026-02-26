/**
 * Tests for the query rewriter. Run with: npm test
 * Uses Node's built-in test runner and assert; mocks global fetch.
 */
import test from 'node:test';
import * as assert from 'node:assert';

function mockOpenAIResponse(content: string) {
  return async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

function mockFetchFail() {
  return async () => {
    throw new Error('Network error');
  };
}

async function runWithMockFetch(
  mock: () => Promise<Response>,
  fn: (rewrite: import('./queryRewriter').rewrite) => Promise<void>
) {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  (globalThis as any).fetch = (url: string) => {
    if (typeof url === 'string' && url.includes('openai.com')) return mock();
    return originalFetch(url as any);
  };
  try {
    const { rewrite } = await import('./queryRewriter');
    await fn(rewrite);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalEnv;
  }
}

test('rewrite with empty previousMessages returns original and was_rewritten false', async () => {
  const { rewrite } = await import('./queryRewriter');
  const result = await rewrite({
    currentQuery: 'KYC for indusind',
    previousMessages: [],
  });
  assert.strictEqual(result.original, 'KYC for indusind');
  assert.strictEqual(result.rewritten, 'KYC for indusind');
  assert.strictEqual(result.was_rewritten, false);
});

test('rewrite when LLM throws returns original and was_rewritten false', async () => {
  await runWithMockFetch(mockFetchFail, async (rewrite) => {
    const result = await rewrite({
      currentQuery: 'Can I do full KYC also?',
      previousMessages: [
        { role: 'user', content: 'KYC for indusind' },
        { role: 'assistant', content: 'Min KYC steps for IndusInd...' },
      ],
    });
    assert.strictEqual(result.original, 'Can I do full KYC also?');
    assert.strictEqual(result.rewritten, 'Can I do full KYC also?');
    assert.strictEqual(result.was_rewritten, false);
  });
});

test('turn 2 simulation: follow-up rewritten to contain full KYC and IndusInd', async () => {
  await runWithMockFetch(
    mockOpenAIResponse('How to do full KYC for IndusInd Bank?'),
    async (rewrite) => {
      const result = await rewrite({
        currentQuery: 'Can i Do full KYC also',
        previousMessages: [
          { role: 'user', content: 'KYC for indusind' },
          { role: 'assistant', content: 'Min KYC requires...' },
        ],
      });
      assert.ok(result.was_rewritten);
      const r = result.rewritten.toLowerCase();
      assert.ok(r.includes('full kyc'), `rewritten should contain "full kyc": ${result.rewritten}`);
      assert.ok(
        r.includes('indusind'),
        `rewritten should contain "indusind": ${result.rewritten}`
      );
    }
  );
});

test('turn 3 simulation: new topic FD not mixed with IndusInd/KYC', async () => {
  await runWithMockFetch(
    mockOpenAIResponse('How to book a fixed deposit?'),
    async (rewrite) => {
      const result = await rewrite({
        currentQuery: 'Can i book FD?',
        previousMessages: [
          { role: 'user', content: 'KYC for indusind' },
          { role: 'assistant', content: 'Min KYC requires...' },
          { role: 'user', content: 'Can i Do full KYC also' },
          { role: 'assistant', content: 'Full KYC steps for IndusInd...' },
        ],
      });
      const r = result.rewritten.toLowerCase();
      assert.ok(
        !r.includes('indusind'),
        `rewritten should not contain "indusind" (new topic): ${result.rewritten}`
      );
      assert.ok(
        !r.includes('kyc') || r.includes('fd') || r.includes('fixed') || r.includes('deposit') || r.includes('book'),
        `rewritten should be about FD/booking, not KYC: ${result.rewritten}`
      );
    }
  );
});

test('standalone query with history unchanged when LLM returns as-is', async () => {
  const query = 'How to open a savings account in ICICI Bank?';
  await runWithMockFetch(mockOpenAIResponse(query), async (rewrite) => {
    const result = await rewrite({
      currentQuery: query,
      previousMessages: [
        { role: 'user', content: 'What is NEFT?' },
        { role: 'assistant', content: 'NEFT is...' },
      ],
    });
    assert.strictEqual(result.rewritten.trim(), query);
    assert.strictEqual(result.was_rewritten, false);
  });
});

test('cleanRewritten strips leading arrow and quotes', async () => {
  await runWithMockFetch(
    mockOpenAIResponse('→ "How to do full KYC for IndusInd Bank?"'),
    async (rewrite) => {
      const result = await rewrite({
        currentQuery: 'Can i Do full KYC also',
        previousMessages: [
          { role: 'user', content: 'KYC for indusind' },
          { role: 'assistant', content: 'Min KYC...' },
        ],
      });
      assert.ok(!result.rewritten.startsWith('→'));
      assert.ok(!result.rewritten.startsWith('"'));
    }
  );
});
