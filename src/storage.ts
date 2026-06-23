import * as fs from "fs";
import * as path from "path";
import type { Database, DayPlan, EveningReview, Lead } from "./types";

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const TMP_FILE = DB_FILE + ".tmp";
const BAK_FILE = DB_FILE + ".bak";

function emptyDb(): Database {
  return { plans: {}, leads: {}, reviews: {} };
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalize(parsed: Partial<Database>): Database {
  return {
    plans: parsed.plans ?? {},
    leads: parsed.leads ?? {},
    reviews: parsed.reviews ?? {},
  };
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Read the database.
 * - Missing file -> a fresh empty DB (first run).
 * - Corrupt file -> NEVER silently start empty. We copy the bad file aside as
 *   db.corrupt.<timestamp>.json and throw a clear error so data isn't lost.
 */
function read(): Database {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) return emptyDb();

  const raw = fs.readFileSync(DB_FILE, "utf8");
  try {
    return normalize(JSON.parse(raw) as Partial<Database>);
  } catch {
    const corruptPath = path.join(DATA_DIR, `db.corrupt.${timestamp()}.json`);
    fs.copyFileSync(DB_FILE, corruptPath);
    throw new Error(
      `db.json is corrupt and could not be parsed. A copy was saved to ` +
        `${corruptPath}. Inspect/fix or delete db.json before restarting — ` +
        `the bot will NOT start with an empty database while a corrupt one exists.`
    );
  }
}

/**
 * Write atomically: serialize to a temp file, back up the current db, then
 * rename the temp file into place (rename is atomic and overwrites on Win/POSIX).
 */
function write(db: Database): void {
  ensureDir();
  fs.writeFileSync(TMP_FILE, JSON.stringify(db, null, 2), "utf8");
  if (fs.existsSync(DB_FILE)) {
    try {
      fs.copyFileSync(DB_FILE, BAK_FILE);
    } catch {
      // backup is best-effort; don't block the write
    }
  }
  fs.renameSync(TMP_FILE, DB_FILE);
}

/**
 * Validate storage health at startup. Throws on a corrupt db.json so the
 * operator sees a clear console error instead of silent data loss.
 */
export function initStorage(): void {
  read();
}

/** Local date as YYYY-MM-DD. */
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function savePlan(userId: number, plan: DayPlan): void {
  const db = read();
  db.plans[`${userId}:${plan.date}`] = plan;
  write(db);
}

export function getPlan(userId: number, date: string): DayPlan | undefined {
  const db = read();
  return db.plans[`${userId}:${date}`];
}

export function addLead(userId: number, lead: Lead): void {
  const db = read();
  const list = db.leads[userId] ?? [];
  list.push(lead);
  db.leads[userId] = list;
  write(db);
}

export function getLeads(userId: number): Lead[] {
  const db = read();
  return db.leads[userId] ?? [];
}

export function saveEveningReview(userId: number, review: EveningReview): void {
  const db = read();
  const list = db.reviews[userId] ?? [];
  list.push(review);
  db.reviews[userId] = list;
  write(db);
}

/** Most recent reviews first. Pass a limit to cap how many are returned. */
export function getEveningReviews(userId: number, limit?: number): EveningReview[] {
  const db = read();
  const list = [...(db.reviews[userId] ?? [])].reverse();
  return limit ? list.slice(0, limit) : list;
}
