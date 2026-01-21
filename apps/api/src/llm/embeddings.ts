import { pipeline } from "@xenova/transformers";

let embedderPromise;

async function getEmbedder() {
  if (!embedderPromise) {
    console.log("🔄 Loading MiniLM embedding model...");
    embedderPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embedderPromise;
}

export async function embedText(text) {
  const embedder = await getEmbedder();

  const cleaned = text
    .replace(/\s+/g, " ")
    .slice(0, 2000);

  const output = await embedder(cleaned, {
    pooling: "mean",
    normalize: true
  });

  return Array.from(output.data);
}
