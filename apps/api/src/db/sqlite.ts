import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

// 🔥 Resolve monorepo root safely
const ROOT_DIR = path.resolve(process.cwd(), "../../");

// 👉 Real DB location
// Always point to root smart_bundle_recommender/data/app.db
const rootDir = path.resolve(process.cwd(), "../../");
const dataDir = path.join(rootDir, "data");

if (!fs.existsSync(dataDir)) {
  throw new Error(`❌ Data directory not found: ${dataDir}`);
}

const dbFile = path.join(dataDir, "app.db");

console.log("📁 CWD:", process.cwd());
console.log("📂 SQLite DB Path:", dbFile);

const sqlite = new Database(dbFile);

const tables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all();

console.log("📊 TABLES FOUND:", tables);


// Run migrations
const migrations = fs.readFileSync(
  path.join(ROOT_DIR, "apps/api/src/db/migrations.sql"),
  "utf8"
);

sqlite.exec(migrations);

export const db = {
  saveQuote(q) {
    const stmt = sqlite.prepare(
      "INSERT OR REPLACE INTO quotes(request_id, lifecycle, input_json, output_json) VALUES(?,?,?,?)"
    );
    stmt.run(
      q.request_id,
      q.lifecycle,
      JSON.stringify(q.input_json),
      JSON.stringify(q.output_json)
    );
  },

  saveFeedback(fb) {
    const stmt = sqlite.prepare(
      "INSERT INTO feedback(request_id, bundle_key, rating, comment) VALUES(?,?,?,?)"
    );
    stmt.run(
      fb.request_id,
      fb.bundle_key,
      fb.rating,
      fb.comment ?? null
    );
  },
};

export{sqlite};