export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly apiKey: string, private readonly model = 'text-embedding-3-small') {}

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Embedding request failed: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as { data: { embedding: number[] }[] };
    return payload.data.map((d) => d.embedding);
  }
}

export const getEmbeddingProvider = (): EmbeddingProvider | null => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAIEmbeddingProvider(apiKey);
};
