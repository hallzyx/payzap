import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { newId, nowIso } from "@/lib/ids";
import { PROTECTED_ORDER_COUNT } from "@/lib/constants";

/**
 * Seeds PayPal batches from data/paypal-captures.json or generates placeholder IDs for preview-only runs.
 *
 * File format:
 * { "batches": [ { "captureIds": ["CAP-...", ...10 items ] } ] }
 */
function main() {
  const file = path.join(process.cwd(), "data", "paypal-captures.json");
  const db = getDb();
  const ts = nowIso();

  let batches: string[][] = [];

  if (fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
      batches?: Array<{ captureIds: string[] }>;
    };
    batches = (raw.batches ?? []).map((b) => b.captureIds);
  } else {
    console.warn(
      "No data/paypal-captures.json found — seeding one preview batch with synthetic capture IDs.",
    );
    const synthetic = Array.from(
      { length: PROTECTED_ORDER_COUNT },
      (_, i) => `SANDBOX-CAP-${Date.now()}-${i}`,
    );
    batches = [synthetic];
  }

  const insert = db.prepare(
    `INSERT INTO paypal_batches (id, status, capture_ids_json, reserved_session_id, created_at, updated_at)
     VALUES (?, 'Ready', ?, NULL, ?, ?)`,
  );

  let count = 0;
  for (const captureIds of batches) {
    if (captureIds.length < PROTECTED_ORDER_COUNT) {
      console.warn(`Skipping batch with ${captureIds.length} captures (need ${PROTECTED_ORDER_COUNT})`);
      continue;
    }
    insert.run(newId("batch"), JSON.stringify(captureIds.slice(0, PROTECTED_ORDER_COUNT)), ts, ts);
    count++;
  }

  console.log(`Seeded ${count} PayPal batch(es).`);
}

main();
