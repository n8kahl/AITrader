import { Pool } from "pg";

let pool: Pool | null = null;
let tableEnsured = false;

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  if (!tableEnsured && pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        level TEXT NOT NULL,
        event TEXT NOT NULL,
        payload JSONB
      );
    `);
    tableEnsured = true;
  }
  return pool;
}

export async function recordJournal(event: string, payload: any, level: "info"|"warn"|"error" = "info") {
  if (!process.env.DATABASE_URL) {
    console.log(`[journal] ${event}`, level, JSON.stringify(payload));
    return;
  }
  try {
    const p = await getPool();
    if (!p) return;
    await p.query("INSERT INTO journal_entries(level, event, payload) VALUES($1,$2,$3)", [level, event, payload]);
  } catch (err) {
    console.error("journal insert failed", err);
  }
}
