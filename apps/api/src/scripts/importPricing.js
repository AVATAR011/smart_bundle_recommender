import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { sqlite } from "../db/sqlite.js";

const filePath = path.resolve(
  process.cwd(),
  "../../data/pricing/pricing_and_rating_combined_motor.csv"
);

console.log("📥 Loading pricing CSV:", filePath);

const raw = fs.readFileSync(filePath, "utf8");
const rows = parse(raw, {
  columns: true,
  skip_empty_lines: true,
});

sqlite.prepare("DELETE FROM pricing_raw").run();

const insert = sqlite.prepare(`
  INSERT INTO pricing_raw (
    policy_type, coverage_name,
    base_rate_inr, addon_price_inr,
    deductible_discount_pct, ev_loading_pct, commercial_loading_pct,
    expected_loss_ratio_band, pricing_action_hint,
    vehicle_age_band, cubic_capacity_band, location_zone,
    driver_age_band, claim_history_band,
    vehicle_age_factor, cubic_capacity_factor,
    location_loading_pct, driver_age_factor,
    claim_history_discount_pct,
    final_rating_multiplier
  ) VALUES (
    @policy_type, @coverage_name,
    @base_rate_inr, @addon_price_inr,
    @deductible_discount_pct, @ev_loading_pct, @commercial_loading_pct,
    @expected_loss_ratio_band, @pricing_action_hint,
    @vehicle_age_band, @cubic_capacity_band, @location_zone,
    @driver_age_band, @claim_history_band,
    @vehicle_age_factor, @cubic_capacity_factor,
    @location_loading_pct, @driver_age_factor,
    @claim_history_discount_pct,
    @final_rating_multiplier
  )
`);

let count = 0;
for (const r of rows) {
  insert.run({
    ...r,
    base_rate_inr: Number(r.base_rate_inr || 0),
    addon_price_inr: Number(r.addon_price_inr || 0),
    deductible_discount_pct: Number(r.deductible_discount_pct || 0),
    ev_loading_pct: Number(r.ev_loading_pct || 0),
    commercial_loading_pct: Number(r.commercial_loading_pct || 0),
    vehicle_age_factor: Number(r.vehicle_age_factor || 1),
    cubic_capacity_factor: Number(r.cubic_capacity_factor || 1),
    location_loading_pct: Number(r.location_loading_pct || 0),
    driver_age_factor: Number(r.driver_age_factor || 1),
    claim_history_discount_pct: Number(r.claim_history_discount_pct || 0),
    final_rating_multiplier: Number(r.final_rating_multiplier || 1),
  });
  count++;
}

console.log(`✅ Imported ${count} pricing rows.`);
process.exit(0);
