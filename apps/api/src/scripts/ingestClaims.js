import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import csv from "csv-parser";

const DB_PATH = path.resolve("data/app.db");   // same DB used by your app
const CSV_PATH = path.resolve("data/claims/enhanced_claims_dataset.csv");

const db = new Database(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS claims_insights (
  insurer TEXT,
  lob TEXT,
  vehicle_type TEXT,
  policy_type TEXT,
  coverage_name TEXT,
  claim_category TEXT,
  frequency_band TEXT,
  severity_band TEXT,
  avg_claim_amount_inr REAL,
  max_claim_amount_inr REAL,
  fraud_risk_level TEXT,
  profitability_tag TEXT,

  -- Actuarial
  claim_frequency REAL,
  loss_ratio REAL,
  pure_premium REAL,
  risk_loading_factor REAL,
  volatility_index REAL,

  -- Geo
  risk_zone TEXT,
  state TEXT,
  city TEXT,
  flood_risk_score REAL,
  theft_risk_score REAL,
  accident_density_score REAL,

  -- Operations
  avg_settlement_days INTEGER,
  fast_track_eligible INTEGER,
  cashless_ratio REAL,
  document_deficiency_rate REAL,
  repudiation_rate REAL
);
`);

db.exec("DELETE FROM claims_insights"); // re-ingest safe

async function ingest() {
  const rows= [];

  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", () => {
      const insert = db.prepare(`
        INSERT INTO claims_insights VALUES (
          @insurer, @lob, @vehicle_type, @policy_type, @coverage_name,
          @claim_category, @frequency_band, @severity_band,
          @avg_claim_amount_inr, @max_claim_amount_inr,
          @fraud_risk_level, @profitability_tag,

          @claim_frequency, @loss_ratio, @pure_premium,
          @risk_loading_factor, @volatility_index,

          @risk_zone, @state, @city,
          @flood_risk_score, @theft_risk_score, @accident_density_score,

          @avg_settlement_days, @fast_track_eligible,
          @cashless_ratio, @document_deficiency_rate, @repudiation_rate
        )
      `);

      const tx = db.transaction((rows) => {
        for (const r of rows) insert.run(r);
      });

      tx(rows);
      console.log(`✅ Claims ingested: ${rows.length}`);
      process.exit(0);
    });
}

ingest();
