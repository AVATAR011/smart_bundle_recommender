import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import { embedText } from "../llm/embeddings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(
  __dirname,
  "../../../../data/vector_store.db"
);

console.log("📂 Vector DB path:", DB_PATH);


// Read-only connection
const db = new Database(DB_PATH, { readonly: true });

/**
 * Cosine similarity
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Initialize DB
 */
export function initVectorStore() {
  const row = db
    .prepare(`SELECT count(*) as count FROM vectors`)
    .get();

  console.log(`✅ Vector DB loaded with ${row.count} vectors`);
}

/**
 * Semantic search
 */
export async function searchPolicyClauses(
  query,
  filters = {},
  topK = 5
) {
  const queryVector = await embedText(query);

  let where = "1=1";
  const params = [];

  if (filters.company) {
    where += ` AND json_extract(metadata, '$.company') = ?`;
    params.push(filters.company);
  }

  if (filters.product) {
    where += ` AND json_extract(metadata, '$.product') = ?`;
    params.push(filters.product);
  }

  const rows = db
    .prepare(
      `
      SELECT id, embedding, content, metadata
      FROM vectors
      WHERE ${where}
      `
    )
    .all(...params);

  const scored = rows.map(row => {
    const embedding = JSON.parse(row.embedding);
    const score = cosineSimilarity(queryVector, embedding);

    return {
      id: row.id,
      text: row.content,
      metadata: JSON.parse(row.metadata),
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}
