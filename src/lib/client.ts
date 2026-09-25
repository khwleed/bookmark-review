import type { Post, Section, QueueOrder } from "./repo";
import type { Platform } from "./import/types";

export type { Post, Section, QueueOrder, Platform };

async function call<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json" } : undefined,
    body: json !== undefined ? JSON.stringify(json) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface QueueParams {
  platform?: Platform | "";
  order?: QueueOrder;
  seed?: number;
  pin?: number;
}

export const api = {
  queue: (p: QueueParams) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "") q.set(k, String(v));
    return call<{ posts: Post[]; remaining: number }>(`/api/queue?${q}`);
  },
  stats: () =>
    call<{ total: number; byStatus: Record<string, number>; today: Record<string, number> }>("/api/stats"),
  sections: () => call<Section[]>("/api/sections"),
  createSection: (name: string) => call<Section>("/api/sections", { method: "POST", json: { name } }),
  updateSection: (id: number, patch: { name?: string; color?: string }) =>
    call(`/api/sections/${id}`, { method: "PATCH", json: patch }),
  deleteSection: (id: number) => call(`/api/sections/${id}`, { method: "DELETE" }),
  reorderSections: (ids: number[]) => call<Section[]>("/api/sections", { method: "PUT", json: { ids } }),
  posts: (p: { sectionId?: number; status?: string; platform?: string; q?: string }) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "") q.set(k, String(v));
    return call<Post[]>(`/api/posts?${q}`);
  },
  review: (body:
    | { action: "sort" | "sections"; postId: number; sectionIds: number[] }
    | { action: "skip" | "archive" | "restore"; postId: number }
    | { action: "note"; postId: number; note: string }) =>
    call("/api/review", { method: "POST", json: body }),
  undo: () => call<{ postId: number | null }>("/api/undo", { method: "POST", json: {} }),
  import: (posts: unknown[], source = "manual") =>
    call<{ added: number; duplicates: number }>("/api/import", { method: "POST", json: { source, posts } }),
};

export function displayAuthor(p: Post) {
  if (p.author) return `@${p.author.replace(/^@/, "")}`;
  return p.platform === "x" ? "X post" : "Instagram post";
}
