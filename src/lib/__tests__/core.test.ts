import { beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "../db";
import { ingest } from "../import/ingest";
import { parsePostUrl, type ImportedPost } from "../import/types";
import {
  archivePost, createSection, deleteSection, getPost, getQueue, listSections,
  setNote, skipPost, sortPost, undo,
} from "../repo";

const x = (id: string, i = 0): ImportedPost => ({
  platform: "x", externalId: id, url: `https://x.com/u/status/${id}`, bookmarkedIndex: i,
});

let db: Database.Database;
beforeEach(() => {
  db = openDb(":memory:");
});

describe("parsePostUrl", () => {
  it("normalises X and twitter links", () => {
    expect(parsePostUrl("https://twitter.com/jack/status/20?s=20")).toMatchObject({
      platform: "x", externalId: "20", url: "https://x.com/jack/status/20",
    });
  });
  it("handles instagram posts and reels", () => {
    expect(parsePostUrl("https://www.instagram.com/reels/ABC_1/")?.url).toBe("https://www.instagram.com/reel/ABC_1/");
    expect(parsePostUrl("https://instagram.com/someone/p/XyZ/")?.externalId).toBe("XyZ");
  });
  it("rejects other urls", () => {
    expect(parsePostUrl("https://example.com/a")).toBeNull();
    expect(parsePostUrl("not a url")).toBeNull();
  });
});

describe("ingest", () => {
  it("dedupes within and across imports and backfills metadata", () => {
    expect(ingest(db, [x("1"), x("2"), x("1")], "scraper")).toEqual({ added: 2, duplicates: 0 });
    expect(ingest(db, [{ ...x("1"), text: "hello" }, x("3")], "scraper")).toEqual({ added: 1, duplicates: 1 });
    expect(getPost(db, 1)?.text_snippet).toBe("hello");
  });
  it("does not re-queue an already sorted post", () => {
    ingest(db, [x("1")], "scraper");
    const s = createSection(db, "Career");
    sortPost(db, 1, [s.id]);
    ingest(db, [x("1")], "scraper");
    expect(getPost(db, 1)?.status).toBe("sorted");
  });
});

describe("queue + actions", () => {
  beforeEach(() => {
    ingest(db, [x("a", 0), x("b", 1), x("c", 2)], "scraper");
  });

  it("skipped posts move behind unskipped ones", () => {
    skipPost(db, 1);
    expect(getQueue(db).posts.map((p) => p.id)).toEqual([2, 3, 1]);
    expect(getQueue(db).remaining).toBe(3);
  });

  it("pin forces a post to the front", () => {
    expect(getQueue(db, { pin: 3 }).posts[0].id).toBe(3);
  });

  it("supports multi-section sorting and derives hotkeys from position", () => {
    const a = createSection(db, "Career");
    const b = createSection(db, "Mindset");
    expect(listSections(db).map((s) => s.hotkey)).toEqual([1, 2]);
    sortPost(db, 1, [a.id, b.id]);
    expect(getPost(db, 1)?.section_ids.sort()).toEqual([a.id, b.id].sort());
    expect(getQueue(db).remaining).toBe(2);
  });

  it("undo walks back multiple actions in order", () => {
    const s = createSection(db, "Tips");
    sortPost(db, 1, [s.id]);
    setNote(db, 2, "why");
    archivePost(db, 2);
    skipPost(db, 3);

    expect(undo(db)).toBe(3);
    expect(getPost(db, 3)).toMatchObject({ status: "inbox", skip_count: 0 });
    expect(undo(db)).toBe(2);
    expect(getPost(db, 2)).toMatchObject({ status: "inbox", note: "why" });
    expect(undo(db)).toBe(2);
    expect(getPost(db, 2)?.note).toBeNull();
    expect(undo(db)).toBe(1);
    expect(getPost(db, 1)).toMatchObject({ status: "inbox", section_ids: [] });
    expect(undo(db)).toBeNull();
  });

  it("deleting a section returns its only-here posts to the queue", () => {
    const a = createSection(db, "A");
    const b = createSection(db, "B");
    sortPost(db, 1, [a.id]);
    sortPost(db, 2, [a.id, b.id]);
    deleteSection(db, a.id);
    expect(getPost(db, 1)?.status).toBe("inbox");
    expect(getPost(db, 2)).toMatchObject({ status: "sorted", section_ids: [b.id] });
  });
});
