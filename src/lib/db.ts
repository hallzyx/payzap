import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "payzap.db");

let db: Database.Database | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS paypal_batches (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      capture_ids_json TEXT NOT NULL,
      reserved_session_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo_sessions (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'buyer',
      product_price_cents INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      campaign_status TEXT NOT NULL DEFAULT 'idle',
      proposed_price_cents INTEGER,
      refund_budget_cents INTEGER,
      recommended_price_cents INTEGER,
      analyzed_prompt TEXT,
      batch_id TEXT,
      is_preview INTEGER NOT NULL DEFAULT 0,
      buyer_notified INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES paypal_batches(id)
    );

    CREATE TABLE IF NOT EXISTS demo_orders (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      is_demo_buyer INTEGER NOT NULL DEFAULT 0,
      product_sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      purchase_price_cents INTEGER NOT NULL,
      price_adjustment_cents INTEGER NOT NULL DEFAULT 0,
      effective_price_cents INTEGER NOT NULL,
      payment_provider TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      order_status TEXT NOT NULL,
      protection_status TEXT NOT NULL,
      purchased_at TEXT NOT NULL,
      protection_expires_at TEXT NOT NULL,
      paypal_capture_id TEXT,
      paypal_refund_id TEXT,
      refund_status TEXT NOT NULL DEFAULT 'queued',
      refund_error TEXT,
      eligibility_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES demo_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_session ON demo_orders(session_id);
    CREATE INDEX IF NOT EXISTS idx_batches_status ON paypal_batches(status);
  `);

  const row = database.prepare(`SELECT COUNT(*) as c FROM paypal_batches`).get() as {
    c: number;
  };
  if (row.c === 0) {
    const captures = Array.from(
      { length: 10 },
      (_, i) => `SANDBOX-CAP-SEED-${i}`,
    );
    const ts = new Date().toISOString();
    database
      .prepare(
        `INSERT INTO paypal_batches (id, status, capture_ids_json, reserved_session_id, created_at, updated_at)
         VALUES (?, 'Ready', ?, NULL, ?, ?)`,
      )
      .run(`batch_seed_${Date.now()}`, JSON.stringify(captures), ts, ts);
  }
}

export function getDb(): Database.Database {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
