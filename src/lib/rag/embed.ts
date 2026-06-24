// ============================================================
// PersonaForge — RAG Embedding Utilities
// ============================================================
// Handles text embedding generation for vector similarity search.
// Uses OpenAI embeddings when available, falls back to a simple
// hash-based embedding for dev/demo.
// ============================================================

const EMBEDDING_DIM = 1536; // OpenAI ada-002 dimension

/**
 * Generate embeddings for a text string.
 * Uses OpenAI embeddings API if available, otherwise falls back
 * to a deterministic hash-based embedding for demo purposes.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-ada-002",
          input: text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data[0].embedding;
      }
    } catch (err) {
      console.warn("[rag/embed] OpenAI embedding failed, using fallback:", err);
    }
  }

  // Deterministic fallback embedding using simple hash
  return generateFallbackEmbedding(text);
}

/**
 * Generate a deterministic pseudo-embedding from text.
 * Not semantically meaningful but provides consistent vectors
 * for demo/dev without an API key.
 */
function generateFallbackEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIM).fill(0);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = (charCode * (i + 1) * 31) % EMBEDDING_DIM;
    embedding[idx] += (charCode - 96) / 26;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(
    embedding.reduce((sum: number, v: number) => sum + v * v, 0)
  );
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
