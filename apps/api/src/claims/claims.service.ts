import { sqlite } from "../db/sqlite";

import path from "path";

const DB_PATH = path.resolve("data/app.db");
// const db = new Database(DB_PATH, { readonly: true });
// const tables = db.prepare(`
//   SELECT name FROM sqlite_master WHERE type='table'
// `).all();

// console.log("📊 Tables in DB:", tables);


export function getClaimsInsights(filters: {
  insurer?: string;
  policy_type?: string;
  coverage_name?: string;
}) {
  const where: string[] = [];
  const params: any = {};
  

  if (filters.insurer) {
    where.push("insurer = @insurer");
    params.insurer = filters.insurer;
  }

  if (filters.policy_type) {
    where.push("policy_type = @policy_type");
    params.policy_type = filters.policy_type;
  }

  if (filters.coverage_name) {
    where.push("coverage_name LIKE @coverage");
    params.coverage = `%${filters.coverage_name}%`;
  }

  const stmt = sqlite.prepare(`
    SELECT *
    FROM claims_insights
    LIMIT 100
  `);

  return stmt.all();
}
