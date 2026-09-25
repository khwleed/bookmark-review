import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS posts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  platform         TEXT NOT NULL CHECK (platform IN ('x','instagram')),
  external_id      TEXT NOT NULL,
  url              TEXT NOT NULL,
  author           TEXT,
  text_snippet     TEXT,
  thumb_url        TEXT,
  source           TEXT NOT NULL DEFAULT 'scraper',
  bookmarked_index INTEGER,
  imported_at      TEXT NOT NULL DEFAULT (datetime('now')),
  status           TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','sorted','skipped','archived')),
  note             TEXT,
  skip_count       INTEGER NOT NULL DEFAULT 0,
  reviewed_at      TEXT,
  UNIQUE (platform, external_id)
);

CREATE TABLE IF NOT EXISTS sections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  position   INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_sections (
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  added_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, section_id)
);

CREATE TABLE IF NOT EXISTS action_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id         INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  snapshot_before TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
`;

export function openDb(file: string): Database.Database {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

const globalForDb = globalThis as unknown as { __bookmarkDb?: Database.Database };

/** Shared connection, reused across dev hot-reloads. */
export function getDb(): Database.Database {
  if (!globalForDb.__bookmarkDb) {
    const file = process.env.BOOKMARK_DB ?? path.join(process.cwd(), "data", "bookmarks.db");
    globalForDb.__bookmarkDb = openDb(file);
  }
  return globalForDb.__bookmarkDb;
}
