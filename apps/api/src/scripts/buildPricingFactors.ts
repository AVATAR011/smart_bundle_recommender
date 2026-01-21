import { sqlite } from "../db/sqlite";

console.log("⚙️ Building pricing_factors...");

sqlite.prepare(`DELETE FROM pricing_factors`).run();

const factors = [
  { name: "vehicle_age", impact: "premium", col: "vehicle_age_factor" },
  { name: "cubic_capacity", impact: "premium", col: "cubic_capacity_factor" },
  { name: "location", impact: "premium", col: "location_loading_pct" },
  { name: "driver_age", impact: "premium", col: "driver_age_factor" },
  { name: "claim_history", impact: "discount", col: "claim_history_discount_pct" },
  { name: "deductible", impact: "discount", col: "deductible_discount_pct" },
  { name: "ev_loading", impact: "premium", col: "ev_loading_pct" },
  { name: "commercial_loading", impact: "premium", col: "commercial_loading_pct" },
];

for (const f of factors) {
  const row = sqlite
    .prepare(
      `
      SELECT
        MIN(${f.col}) as min,
        AVG(${f.col}) as avg,
        MAX(${f.col}) as max
      FROM pricing_raw
    `
    )
    .get();

  sqlite.prepare(`
    INSERT INTO pricing_factors
    (factor_name, impact_type, multiplier_low, multiplier_medium, multiplier_high, regulatory_limit_notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    f.name,
    f.impact,
    row.min ?? 1,
    row.avg ?? 1,
    row.max ?? 1,
    "Subject to IRDAI motor tariff constraints"
  );
}

console.log("✅ pricing_factors built.");
process.exit(0);
