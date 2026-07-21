const DEFAULT_TEMPERATURE = 10;

/**
 * Convert a raw cosine similarity score into an independent probability.
 * This avoids softmax competition between labels and keeps each scene score easy to threshold.
 */
export function sigmoidProbability(similarity: number, temperature = DEFAULT_TEMPERATURE): number {
  return 1 / (1 + Math.exp(-similarity * temperature));
}

export function computeCosineSimilarities(
  visualEmbeddingJson: string,
  labelEmbeddings: Map<string, string>,
): { sceneLabel: string; similarity: number }[] {
  const visual = parseEmbedding(visualEmbeddingJson);
  const results: { sceneLabel: string; similarity: number }[] = [];

  for (const [label, textEmbJson] of labelEmbeddings) {
    const textEmb = parseEmbedding(textEmbJson);
    if (textEmb.length !== visual.length) {
      continue;
    }
    const similarity = cosineSimilarity(visual, textEmb);
    results.push({
      sceneLabel: label,
      similarity: sigmoidProbability(similarity),
    });
  }

  return results;
}

function parseEmbedding(embedding: string): number[] {
  // Handle both JSON array format [0.1,0.2,...] and PostgreSQL vector format [0.1,0.2,...]
  const trimmed = embedding.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return JSON.parse(trimmed) as number[];
  }
  throw new Error(`Unsupported embedding format: ${trimmed.substring(0, 50)}`);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) {
    return 0;
  }
  return dot / denom;
}
