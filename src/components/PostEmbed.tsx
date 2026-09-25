"use client";

import { useState } from "react";
import { displayAuthor, type Post } from "@/lib/client";
import { XEmbed } from "./XEmbed";
import { InstagramEmbed } from "./InstagramEmbed";

/** Official embed with a skeleton while loading and a plain fallback card if it fails. */
export function PostEmbed({ post }: { post: Post }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  return (
    <div className="relative w-full">
      {state === "loading" && (
        <div className="absolute inset-x-0 top-0 mx-auto max-w-[540px] h-72 rounded-xl bg-[var(--muted)] animate-pulse" />
      )}
      {state === "failed" ? (
        <FallbackCard post={post} />
      ) : (
        <div className={state === "loading" ? "opacity-0" : "opacity-100 transition-opacity"}>
          {post.platform === "x" ? (
            <XEmbed tweetId={post.external_id} onState={setState} />
          ) : (
            <InstagramEmbed url={post.url} onState={setState} />
          )}
        </div>
      )}
    </div>
  );
}

function FallbackCard({ post }: { post: Post }) {
  return (
    <div className="mx-auto max-w-[540px] rounded-xl border border-[var(--line)] bg-[var(--card)] p-5">
      <div className="text-sm text-[var(--dim)] mb-2">
        {displayAuthor(post)} · couldn’t load the embed (deleted, private, or offline)
      </div>
      {post.thumb_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumb_url} alt="" className="rounded-lg mb-3 max-h-80 object-cover" referrerPolicy="no-referrer" />
      )}
      {post.text_snippet && <p className="whitespace-pre-wrap leading-relaxed">{post.text_snippet}</p>}
      <a href={post.url} target="_blank" rel="noreferrer" className="inline-block mt-3 text-[var(--accent)] underline">
        Open original ↗
      </a>
    </div>
  );
}
