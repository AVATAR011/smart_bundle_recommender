import fs from "fs";
import path from "path";
import { initVectorStore, addDocument } from "../rag/vector.service.js";

const DATA_PATH = path.resolve("data/processed_chunks.json");

async function ingest() {
  await initVectorStore();

  const chunks = JSON.parse(
    fs.readFileSync(DATA_PATH, "utf-8")
  );

  console.log(`📦 Ingesting ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];

    await addDocument(
      c.id,
      c.content,        // your field name
      {
        ...c.metadata,
        section: c.section
      }
    );

    if (i % 20 === 0) {
      console.log(`✅ Embedded ${i}/${chunks.length}`);
    }
  }

  console.log("🎉 Ingestion complete");
}

ingest();
