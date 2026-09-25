import type Database from "better-sqlite3";
import type { ImportedPost, ImportSource } from "./types";

export interface IngestResult {
  added: number;
  duplicates: number;
}

/**
 * Store posts from any importer. Existing posts (same platform + id) are never
 * re-queued or overwritten — we only fill in metadata that was missing before.
 */
export function ingest(db: Database.Database, posts: ImportedPost[], source: ImportSource): IngestResult {
  const exists = db.prepare("SELECT id FROM posts WHERE platform = ? AND external_id = ?");
  const insert = db.prepare(`
    INSERT INTO posts (platform, external_id, url, author, text_snippet, thumb_url, source, bookmarked_index)
    VALUES (@platform, @externalId, @url, @author, @text, @thumbUrl, @source, @bookmarkedIndex)
  `);
  const backfill = db.prepare(`
    UPDATE posts SET
      author       = COALESCE(author, @author),
      text_snippet = COALESCE(text_snippet, @text),
      thumb_url    = COALESCE(thumb_url, @thumbUrl)
    WHERE id = @id
  `);

  const run = db.transaction((batch: ImportedPost[]) => {
    const result: IngestResult = { added: 0, duplicates: 0 };
    const seen = new Set<string>();
    for (const p of batch) {
      const key = `${p.platform}:${p.externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const params = {
        platform: p.platform,
        externalId: p.externalId,
        url: p.url,
        author: p.author ?? null,
        text: p.text ?? null,
        thumbUrl: p.thumbUrl ?? null,
        bookmarkedIndex: p.bookmarkedIndex ?? null,
        source,
      };
      const row = exists.get(p.platform, p.externalId) as { id: number } | undefined;
      if (row) {
        backfill.run({ ...params, id: row.id });
        result.duplicates++;
      } else {
        insert.run(params);
        result.added++;
      }
    }
    return result;
  });

  return run(posts);
}
