import { z } from "zod";

export const PLATFORMS = ["x", "instagram"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const SOURCES = ["scraper", "manual", "x_api", "ig_zip"] as const;
export type ImportSource = (typeof SOURCES)[number];

/** The normalised shape every importer (scraper, X API, IG zip, manual paste) produces. */
export const ImportedPostSchema = z.object({
  platform: z.enum(PLATFORMS),
  externalId: z.string().min(1).max(64),
  url: z.string().url(),
  author: z.string().max(200).optional(),
  text: z.string().max(5000).optional(),
  thumbUrl: z.string().url().max(2000).optional(),
  bookmarkedIndex: z.number().int().nonnegative().optional(),
});
export type ImportedPost = z.infer<typeof ImportedPostSchema>;

export const ImportRequestSchema = z.object({
  source: z.enum(SOURCES).default("scraper"),
  posts: z.array(ImportedPostSchema).max(5000),
});

/** Turn a pasted X / Instagram link into an ImportedPost, or null if it isn't one. */
export function parsePostUrl(raw: string): ImportedPost | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|mobile\.)/, "");

  if (host === "x.com" || host === "twitter.com") {
    const m = u.pathname.match(/^\/([^/]+)\/status(?:es)?\/(\d+)/);
    if (!m) return null;
    return {
      platform: "x",
      externalId: m[2],
      author: m[1],
      url: `https://x.com/${m[1]}/status/${m[2]}`,
    };
  }

  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const kind = m[1] === "reels" ? "reel" : m[1];
    return {
      platform: "instagram",
      externalId: m[2],
      url: `https://www.instagram.com/${kind}/${m[2]}/`,
    };
  }

  return null;
}
