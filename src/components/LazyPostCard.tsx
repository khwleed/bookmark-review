"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { displayAuthor, type Post } from "@/lib/client";
import { PostEmbed } from "./PostEmbed";

/** A post card for grids: only mounts the (heavy) embed once it scrolls near view. */
export function LazyPostCard({ post, children }: { post: Post; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && (setVisible(true), io.disconnect()), {
      rootMargin: "600px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="break-inside-avoid mb-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--dim)]">
        <span>{post.platform === "x" ? "𝕏" : "📷"} {displayAuthor(post)}</span>
        <a href={post.url} target="_blank" rel="noreferrer" className="hover:text-[var(--fg)]">Open ↗</a>
      </div>
      {visible ? <PostEmbed post={post} /> : <div className="h-72 rounded-xl bg-[var(--muted)]" />}
      {children}
    </div>
  );
}
