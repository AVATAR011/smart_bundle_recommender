import { sqlite } from "../db/sqlite";

console.log("📊 Building coverage_loss_metrics...");

sqlite.prepare(`DELETE FROM coverage_loss_metrics`).run();

const rows = sqlite.prepare(`
  SELECT
    c.coverage_name,
    c.policy_type,

    AVG(c.claim_frequency)             AS avg_claim_frequency,
    AVG(c.avg_claim_amount_inr)        AS avg_claim_severity,
    AVG(c.loss_ratio)                  AS loss_ratio,
    AVG(c.volatility_index)            AS volatility_score,

    AVG(
      CASE
        WHEN c.fraud_risk_level = 'high' THEN 0.3
        WHEN c.fraud_risk_level = 'medium' THEN 0.15
        ELSE 0.05
      END
    ) AS fraud_rate,

    AVG(c.avg_claim_amount_inr) / 50000.0       AS repair_cost_index,

    AVG(
      c.flood_risk_score +
      c.theft_risk_score +
      c.accident_density_score
    ) / 3.0 AS geographic_risk_factor,

    p.expected_loss_ratio_band,
    p.pricing_action_hint

  FROM claims_insights c
  LEFT JOIN pricing_raw p
    ON c.coverage_name = p.coverage_name
   AND c.policy_type = p.policy_type

  GROUP BY c.coverage_name, c.policy_type
`).all();

const insert = sqlite.prepare(`
  INSERT INTO coverage_loss_metrics (
    coverage_name,
    policy_type,
    avg_claim_frequency,
    avg_claim_severity,
    loss_ratio,
    volatility_score,
    fraud_rate,
    repair_cost_index,
    geographic_risk_factor,
    pricing_loss_ratio_band,
    pricing_action_hint,
    last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

for (const r of rows) {
  insert.run(
    r.coverage_name,
    r.policy_type,
    r.avg_claim_frequency,
    r.avg_claim_severity,
    r.loss_ratio,
    r.volatility_score,
    r.fraud_rate,
    r.repair_cost_index,
    r.geographic_risk_factor,
    r.expected_loss_ratio_band,
    r.pricing_action_hint
  );
}

console.log(`✅ Built ${rows.length} coverage metrics.`);
process.exit(0);
