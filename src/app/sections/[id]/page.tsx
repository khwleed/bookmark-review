"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type Post, type Section } from "@/lib/client";
import { LazyPostCard } from "@/components/LazyPostCard";

export default function SectionDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const [sections, setSections] = useState<Section[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [platform, setPlatform] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const section = sections.find((s) => s.id === id);

  const refresh = useCallback(async () => {
    try {
      const [secs, ps] = await Promise.all([api.sections(), api.posts({ sectionId: id, platform, q })]);
      setSections(secs);
      setPosts(ps);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, platform, q]);

  useEffect(() => {
    const t = setTimeout(refresh, 200); // debounce search typing
    return () => clearTimeout(t);
  }, [refresh]);

  const toggleSection = async (post: Post, sid: number) => {
    const next = post.section_ids.includes(sid) ? post.section_ids.filter((x) => x !== sid) : [...post.section_ids, sid];
    await api.review({ action: "sections", postId: post.id, sectionIds: next }).catch((e) => setError(e.message));
    refresh();
  };

  const saveNote = async (post: Post, note: string) => {
    if ((post.note ?? "") === note.trim()) return;
    await api.review({ action: "note", postId: post.id, note }).catch((e) => setError(e.message));
    refresh();
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/sections" className="text-sm text-[var(--dim)] hover:text-[var(--fg)]">← Sections</Link>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          {section && <span className="h-3 w-3 rounded-full" style={{ background: section.color }} />}
          {section?.name ?? "…"}
        </h1>
        <span className="text-[var(--dim)]">{posts?.length ?? 0} posts</span>
        <div className="ml-auto flex gap-2">
          <input className="input" placeholder="Search text, author, notes…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">All</option>
            <option value="x">X</option>
            <option value="instagram">Instagram</option>
          </select>
          <a className="btn" href={`/api/export?sectionId=${id}`} download>Export .md</a>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {posts?.length === 0 && <p className="text-[var(--dim)]">Nothing here yet. Sort some posts into this section from the Review screen.</p>}

      <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
        {posts?.map((p) => (
          <LazyPostCard key={p.id} post={p}>
            <textarea
              className="input w-full text-sm"
              rows={1}
              placeholder="Add a note…"
              defaultValue={p.note ?? ""}
              onBlur={(e) => saveNote(p, e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              {sections.map((s) => {
                const on = p.section_ids.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSection(p, s.id)}
                    className="rounded-full border px-2 py-0.5 text-xs"
                    style={{ borderColor: on ? s.color : "var(--line)", background: on ? `${s.color}22` : undefined, opacity: on ? 1 : 0.6 }}
                    title={on ? `Remove from ${s.name}` : `Add to ${s.name}`}
                  >
                    {on ? "✓ " : "+ "}{s.name}
                  </button>
                );
              })}
            </div>
          </LazyPostCard>
        ))}
      </div>
      <p className="text-xs text-[var(--dim)]">Removing a post from its last section archives it. You can restore it from Archive.</p>
    </div>
  );
}
