import type Database from "better-sqlite3";
import type { Platform } from "./import/types";

export type PostStatus = "inbox" | "sorted" | "skipped" | "archived";

export interface Post {
  id: number;
  platform: Platform;
  external_id: string;
  url: string;
  author: string | null;
  text_snippet: string | null;
  thumb_url: string | null;
  source: string;
  imported_at: string;
  status: PostStatus;
  note: string | null;
  skip_count: number;
  reviewed_at: string | null;
  section_ids: number[];
}

export interface Section {
  id: number;
  name: string;
  color: string;
  position: number;
  /** 1–9 for the first nine sections by position, otherwise null. */
  hotkey: number | null;
  post_count: number;
}

export type QueueOrder = "newest" | "oldest" | "shuffle";

export interface QueueOptions {
  platform?: Platform;
  order?: QueueOrder;
  seed?: number;
  /** Post to force to the front (used after undo so you land back on that card). */
  pin?: number;
  limit?: number;
}

type PostRow = Omit<Post, "section_ids"> & { section_ids: string | null };

const POST_SELECT = `
  SELECT p.*, (SELECT group_concat(section_id) FROM post_sections ps WHERE ps.post_id = p.id) AS section_ids
  FROM posts p
`;

function hydrate(row: PostRow): Post {
  return {
    ...row,
    section_ids: row.section_ids ? row.section_ids.split(",").map(Number) : [],
  };
}

// ── Sections ────────────────────────────────────────────────────────────────

export const SECTION_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4",
  "#ec4899", "#8b5cf6", "#84cc16", "#f97316",
];

export function listSections(db: Database.Database): Section[] {
  const rows = db
    .prepare(
      `SELECT s.*, (SELECT count(*) FROM post_sections ps WHERE ps.section_id = s.id) AS post_count
       FROM sections s ORDER BY position, id`,
    )
    .all() as Omit<Section, "hotkey">[];
  return rows.map((s, i) => ({ ...s, hotkey: i < 9 ? i + 1 : null }));
}

export function createSection(db: Database.Database, name: string, color?: string): Section {
  const { n, maxPos } = db
    .prepare("SELECT count(*) AS n, coalesce(max(position), -1) AS maxPos FROM sections")
    .get() as { n: number; maxPos: number };
  const info = db
    .prepare("INSERT INTO sections (name, color, position) VALUES (?, ?, ?)")
    .run(name.trim(), color ?? SECTION_COLORS[n % SECTION_COLORS.length], maxPos + 1);
  return listSections(db).find((s) => s.id === Number(info.lastInsertRowid))!;
}

export function updateSection(db: Database.Database, id: number, patch: { name?: string; color?: string }) {
  db.prepare("UPDATE sections SET name = coalesce(?, name), color = coalesce(?, color) WHERE id = ?")
    .run(patch.name?.trim() ?? null, patch.color ?? null, id);
}

export function reorderSections(db: Database.Database, orderedIds: number[]) {
  const stmt = db.prepare("UPDATE sections SET position = ? WHERE id = ?");
  db.transaction(() => orderedIds.forEach((id, i) => stmt.run(i, id)))();
}

/** Delete a section. Posts that were only in this section go back to the review queue. */
export function deleteSection(db: Database.Database, id: number) {
  db.transaction(() => {
    db.prepare(
      `UPDATE posts SET status = 'inbox', reviewed_at = NULL
       WHERE status = 'sorted' AND id IN (
         SELECT post_id FROM post_sections GROUP BY post_id
         HAVING count(*) = 1 AND max(section_id) = ?
       )`,
    ).run(id);
    db.prepare("DELETE FROM sections WHERE id = ?").run(id);
  })();
}

// ── Queue ───────────────────────────────────────────────────────────────────

export function getPost(db: Database.Database, id: number): Post | undefined {
  const row = db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(id) as PostRow | undefined;
  return row && hydrate(row);
}

/**
 * The review queue: inbox + skipped posts. Skipping bumps skip_count, which sorts
 * the post behind everything skipped fewer times — i.e. "to the back of the line".
 */
export function getQueue(db: Database.Database, opts: QueueOptions = {}) {
  const where = ["p.status IN ('inbox','skipped')"];
  const params: Record<string, unknown> = {
    pin: opts.pin ?? -1,
    seed: opts.seed ?? 0,
    limit: opts.limit ?? 3,
  };
  if (opts.platform) {
    where.push("p.platform = @platform");
    params.platform = opts.platform;
  }
  const orderBy = {
    newest: "p.imported_at DESC, p.id ASC",
    oldest: "p.imported_at ASC, p.id DESC",
    // Deterministic per seed, so a reload keeps the same shuffled order.
    shuffle: "((p.id * 2654435761 + @seed) % 4294967291)",
  }[opts.order ?? "newest"];

  const rows = db
    .prepare(
      `${POST_SELECT} WHERE ${where.join(" AND ")}
       ORDER BY (p.id = @pin) DESC, p.skip_count ASC, ${orderBy} LIMIT @limit`,
    )
    .all(params) as PostRow[];

  const count = db
    .prepare(`SELECT count(*) AS n FROM posts p WHERE ${where.join(" AND ")}`)
    .get(opts.platform ? { platform: opts.platform } : {}) as { n: number };

  return { posts: rows.map(hydrate), remaining: count.n };
}

export function getStats(db: Database.Database) {
  const byStatus = db.prepare("SELECT status, count(*) AS n FROM posts GROUP BY status").all() as {
    status: PostStatus;
    n: number;
  }[];
  const today = db
    .prepare(
      `SELECT status, count(*) AS n FROM posts
       WHERE reviewed_at >= datetime('now', 'start of day') GROUP BY status`,
    )
    .all() as { status: PostStatus; n: number }[];
  const toMap = (rows: { status: PostStatus; n: number }[]) =>
    Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<PostStatus, number>>;
  return { total: byStatus.reduce((a, r) => a + r.n, 0), byStatus: toMap(byStatus), today: toMap(today) };
}

// ── Review actions (all undoable) ───────────────────────────────────────────

interface Snapshot {
  status: PostStatus;
  note: string | null;
  skip_count: number;
  reviewed_at: string | null;
  section_ids: number[];
}

function snapshot(db: Database.Database, postId: number): Snapshot {
  const p = getPost(db, postId);
  if (!p) throw new Error(`Post ${postId} not found`);
  return {
    status: p.status,
    note: p.note,
    skip_count: p.skip_count,
    reviewed_at: p.reviewed_at,
    section_ids: p.section_ids,
  };
}

function setSections(db: Database.Database, postId: number, sectionIds: number[]) {
  db.prepare("DELETE FROM post_sections WHERE post_id = ?").run(postId);
  const ins = db.prepare("INSERT OR IGNORE INTO post_sections (post_id, section_id) VALUES (?, ?)");
  for (const sid of sectionIds) ins.run(postId, sid);
}

/** Record the pre-change state in action_log, then apply the change — atomically. */
function mutate(db: Database.Database, postId: number, action: string, apply: () => void) {
  db.transaction(() => {
    const before = snapshot(db, postId);
    db.prepare("INSERT INTO action_log (post_id, action, snapshot_before) VALUES (?, ?, ?)")
      .run(postId, action, JSON.stringify(before));
    apply();
  })();
}

export function sortPost(db: Database.Database, postId: number, sectionIds: number[]) {
  if (sectionIds.length === 0) throw new Error("Pick at least one section");
  mutate(db, postId, "sort", () => {
    setSections(db, postId, sectionIds);
    db.prepare("UPDATE posts SET status = 'sorted', reviewed_at = datetime('now') WHERE id = ?").run(postId);
  });
}

export function skipPost(db: Database.Database, postId: number) {
  mutate(db, postId, "skip", () => {
    db.prepare("UPDATE posts SET status = 'skipped', skip_count = skip_count + 1 WHERE id = ?").run(postId);
  });
}

export function archivePost(db: Database.Database, postId: number) {
  mutate(db, postId, "archive", () => {
    setSections(db, postId, []);
    db.prepare("UPDATE posts SET status = 'archived', reviewed_at = datetime('now') WHERE id = ?").run(postId);
  });
}

/** Send a post back to the review queue (from archive, skipped or a section). */
export function restorePost(db: Database.Database, postId: number) {
  mutate(db, postId, "restore", () => {
    setSections(db, postId, []);
    db.prepare("UPDATE posts SET status = 'inbox', skip_count = 0, reviewed_at = NULL WHERE id = ?").run(postId);
  });
}

export function setNote(db: Database.Database, postId: number, note: string) {
  mutate(db, postId, "note", () => {
    db.prepare("UPDATE posts SET note = ? WHERE id = ?").run(note.trim() || null, postId);
  });
}

/** Edit a sorted post's sections from the section view. Removing the last one archives it. */
export function editPostSections(db: Database.Database, postId: number, sectionIds: number[]) {
  mutate(db, postId, "edit-sections", () => {
    setSections(db, postId, sectionIds);
    db.prepare(
      `UPDATE posts SET status = ?, reviewed_at = coalesce(reviewed_at, datetime('now')) WHERE id = ?`,
    ).run(sectionIds.length ? "sorted" : "archived", postId);
  });
}

/** Revert the most recent action. Returns the affected post id, or null if nothing to undo. */
export function undo(db: Database.Database): number | null {
  return db.transaction(() => {
    const last = db
      .prepare("SELECT id, post_id, snapshot_before FROM action_log ORDER BY id DESC LIMIT 1")
      .get() as { id: number; post_id: number; snapshot_before: string } | undefined;
    if (!last) return null;
    const s = JSON.parse(last.snapshot_before) as Snapshot;
    db.prepare("UPDATE posts SET status = ?, note = ?, skip_count = ?, reviewed_at = ? WHERE id = ?")
      .run(s.status, s.note, s.skip_count, s.reviewed_at, last.post_id);
    // Sections deleted since the snapshot are silently dropped.
    const live = new Set(listSections(db).map((x) => x.id));
    setSections(db, last.post_id, s.section_ids.filter((id) => live.has(id)));
    db.prepare("DELETE FROM action_log WHERE id = ?").run(last.id);
    return last.post_id;
  })();
}

// ── Browsing ────────────────────────────────────────────────────────────────

export interface ListOptions {
  sectionId?: number;
  status?: PostStatus;
  platform?: Platform;
  q?: string;
  limit?: number;
}

export function listPosts(db: Database.Database, opts: ListOptions): Post[] {
  const where: string[] = [];
  const params: Record<string, unknown> = { limit: opts.limit ?? 500 };
  if (opts.sectionId !== undefined) {
    where.push("EXISTS (SELECT 1 FROM post_sections ps WHERE ps.post_id = p.id AND ps.section_id = @sectionId)");
    params.sectionId = opts.sectionId;
  }
  if (opts.status) {
    where.push("p.status = @status");
    params.status = opts.status;
  }
  if (opts.platform) {
    where.push("p.platform = @platform");
    params.platform = opts.platform;
  }
  if (opts.q?.trim()) {
    where.push("(p.text_snippet LIKE @q OR p.author LIKE @q OR p.note LIKE @q OR p.url LIKE @q)");
    params.q = `%${opts.q.trim()}%`;
  }
  const rows = db
    .prepare(
      `${POST_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY coalesce(p.reviewed_at, p.imported_at) DESC, p.id DESC LIMIT @limit`,
    )
    .all(params) as PostRow[];
  return rows.map(hydrate);
}

// ── Export ──────────────────────────────────────────────────────────────────

export function exportSectionMarkdown(db: Database.Database, sectionId: number): string {
  const section = listSections(db).find((s) => s.id === sectionId);
  if (!section) throw new Error("Section not found");
  const posts = listPosts(db, { sectionId, limit: 100000 });
  const lines = [`# ${section.name}`, "", `_${posts.length} posts · exported ${new Date().toISOString().slice(0, 10)}_`, ""];
  for (const p of posts) {
    const who = p.author ? `@${p.author.replace(/^@/, "")}` : p.platform === "x" ? "X post" : "Instagram post";
    const snippet = p.text_snippet ? ` — ${p.text_snippet.replace(/\s+/g, " ").slice(0, 140)}` : "";
    lines.push(`- [${who}](${p.url})${snippet}`);
    if (p.note) lines.push(`  - 📝 ${p.note}`);
  }
  return lines.join("\n") + "\n";
}

export function exportAllJson(db: Database.Database) {
  return {
    exportedAt: new Date().toISOString(),
    sections: listSections(db),
    posts: listPosts(db, { limit: 1_000_000 }),
  };
}
