CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  lifecycle TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  bundle_key TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ================================
-- PRICING DATA
-- ================================

CREATE TABLE IF NOT EXISTS pricing_raw (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  policy_type TEXT,
  coverage_name TEXT,

  base_rate_inr REAL,
  addon_price_inr REAL,

  deductible_discount_pct REAL,
  ev_loading_pct REAL,
  commercial_loading_pct REAL,

  expected_loss_ratio_band TEXT,
  pricing_action_hint TEXT,

  vehicle_age_band TEXT,
  cubic_capacity_band TEXT,
  location_zone TEXT,
  driver_age_band TEXT,
  claim_history_band TEXT,

  vehicle_age_factor REAL,
  cubic_capacity_factor REAL,
  location_loading_pct REAL,
  driver_age_factor REAL,
  claim_history_discount_pct REAL,

  final_rating_multiplier REAL
);


CREATE TABLE IF NOT EXISTS pricing_factors (
  factor_name TEXT PRIMARY KEY,
  impact_type TEXT,
  multiplier_low REAL,
  multiplier_medium REAL,
  multiplier_high REAL,
  regulatory_limit_notes TEXT
);


CREATE TABLE IF NOT EXISTS coverage_loss_metrics (
  coverage_name TEXT,
  policy_type TEXT,

  avg_claim_frequency REAL,
  avg_claim_severity REAL,
  loss_ratio REAL,
  volatility_score REAL,
  fraud_rate REAL,

  repair_cost_index REAL,
  geographic_risk_factor REAL,

  pricing_loss_ratio_band TEXT,
  pricing_action_hint TEXT,

  last_updated TEXT
);


CREATE TABLE IF NOT EXISTS segment_loss_metrics (
  segment_name TEXT,
  vehicle_type TEXT,
  location_zone TEXT,
  driver_age_band TEXT,
  vehicle_age_band TEXT,

  avg_premium REAL,
  avg_claim_cost REAL,
  loss_ratio REAL,
  fraud_rate REAL,

  retention_rate REAL,
  growth_rate REAL,

  last_updated TEXT
);
