"use client";

import { useCallback, useEffect, useState } from "react";
import { api, displayAuthor, type Post } from "@/lib/client";

const TABS = [
  { status: "archived", label: "Archived" },
  { status: "skipped", label: "Skipped" },
] as const;

export default function ArchivePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["status"]>("archived");
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => api.posts({ status: tab }).then(setPosts).catch((e) => setError(e.message)), [tab]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const restore = async (p: Post) => {
    await api.review({ action: "restore", postId: p.id }).catch((e) => setError(e.message));
    refresh();
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Archive & skipped</h1>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.status} className="btn" style={tab === t.status ? { background: "var(--muted)", fontWeight: 600 } : undefined} onClick={() => setTab(t.status)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "skipped" && <p className="text-sm text-[var(--dim)]">Skipped posts are still in the review queue, at the back. Restoring resets their skip count.</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--card)]">
        {posts.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            {p.thumb_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumb_url} alt="" className="h-12 w-12 rounded object-cover" referrerPolicy="no-referrer" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{p.platform === "x" ? "𝕏" : "📷"} {displayAuthor(p)}</div>
              <div className="truncate text-sm text-[var(--dim)]">{p.text_snippet ?? p.url}</div>
            </div>
            <a className="btn" href={p.url} target="_blank" rel="noreferrer">Open ↗</a>
            <button className="btn" onClick={() => restore(p)}>Back to queue</button>
          </li>
        ))}
        {posts.length === 0 && <li className="p-4 text-sm text-[var(--dim)]">Nothing here.</li>}
      </ul>
    </div>
  );
}
