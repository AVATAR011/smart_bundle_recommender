import { sqlite } from "../db/sqlite";

console.log("📈 Building segment_loss_metrics...");

sqlite.prepare(`DELETE FROM segment_loss_metrics`).run();

const rows = sqlite.prepare(`
  SELECT
    c.vehicle_type,
    c.risk_zone,
    p.vehicle_age_band,
    p.driver_age_band,

    AVG(c.avg_claim_amount_inr) AS avg_claim_cost,
    AVG(c.loss_ratio) AS loss_ratio,

    AVG(
      CASE
        WHEN c.fraud_risk_level = 'high' THEN 0.3
        WHEN c.fraud_risk_level = 'medium' THEN 0.15
        ELSE 0.05
      END
    ) AS fraud_rate,

    AVG(p.base_rate_inr * p.final_rating_multiplier) AS avg_premium

  FROM claims_insights c
  LEFT JOIN pricing_raw p
    ON c.coverage_name = p.coverage_name
   AND c.policy_type = p.policy_type

  GROUP BY
    c.vehicle_type,
    c.risk_zone,
    p.vehicle_age_band,
    p.driver_age_band
`).all();

const insert = sqlite.prepare(`
  INSERT INTO segment_loss_metrics (
    segment_name,
    vehicle_type,
    location_zone,
    driver_age_band,
    vehicle_age_band,
    avg_premium,
    avg_claim_cost,
    loss_ratio,
    fraud_rate,
    retention_rate,
    growth_rate,
    last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

for (const r of rows) {
  const segmentName = `${r.vehicle_type}-${r.risk_zone}-${r.vehicle_age_band ?? "NA"}`;

  insert.run(
    segmentName,
    r.vehicle_type,
    r.risk_zone,
    r.vehicle_age_band,
    r.driver_age_band,
    r.avg_premium,
    r.avg_claim_cost,
    r.loss_ratio,
    r.fraud_rate,
    0.65, // placeholder retention
    0.08  // placeholder growth
  );
}

console.log(`✅ Built ${rows.length} segment metrics.`);
process.exit(0);
