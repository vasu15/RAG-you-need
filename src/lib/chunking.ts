export type ChunkMeta = {
  headingPath?: string[];
  approxCharStart: number;
  approxCharEnd: number;
};

export type ChunkOutput = {
  content: string;
  tokenCount: number;
  meta: ChunkMeta;
};

const TARGET_CHARS = 1800;
const OVERLAP_SENTENCES = 2;

const sentenceSplit = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const detectHeading = (line: string) => {
  const m = line.match(/^(#{1,6})\s+(.+)$/);
  if (!m) return null;
  return { level: m[1].length, text: m[2].trim() };
};

export const chunkText = (input: string): ChunkOutput[] => {
  const lines = input.split(/\r?\n/);
  const sections: { headingPath: string[]; text: string }[] = [];
  const headingStack: string[] = [];

  let current = '';
  for (const line of lines) {
    const heading = detectHeading(line);
    if (heading) {
      if (current.trim()) {
        sections.push({ headingPath: [...headingStack], text: current.trim() });
        current = '';
      }
      headingStack[heading.level - 1] = heading.text;
      headingStack.splice(heading.level);
      continue;
    }
    current += `${line}\n`;
  }
  if (current.trim()) sections.push({ headingPath: [...headingStack], text: current.trim() });

  const chunks: ChunkOutput[] = [];
  let cursor = 0;
  let overlap = '';

  for (const section of sections.length ? sections : [{ headingPath: [], text: input }]) {
    const paragraphs = section.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    let buffer = overlap ? `${overlap}\n\n` : '';
    let bufferStart = cursor;

    for (const paragraph of paragraphs) {
      const tentative = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      if (tentative.length > TARGET_CHARS && buffer.trim()) {
        const content = buffer.trim();
        const approxCharEnd = bufferStart + content.length;
        chunks.push({
          content,
          tokenCount: Math.ceil(content.length / 4),
          meta: { headingPath: section.headingPath, approxCharStart: bufferStart, approxCharEnd },
        });
        const sentences = sentenceSplit(content);
        overlap = sentences.slice(-OVERLAP_SENTENCES).join(' ');
        buffer = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
        bufferStart = approxCharEnd;
      } else {
        buffer = tentative;
      }
    }

    if (buffer.trim()) {
      const content = buffer.trim();
      const approxCharEnd = bufferStart + content.length;
      chunks.push({
        content,
        tokenCount: Math.ceil(content.length / 4),
        meta: { headingPath: section.headingPath, approxCharStart: bufferStart, approxCharEnd },
      });
      const sentences = sentenceSplit(content);
      overlap = sentences.slice(-OVERLAP_SENTENCES).join(' ');
      cursor = approxCharEnd;
    }
  }

  return chunks;
};
