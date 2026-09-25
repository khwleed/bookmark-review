"use client";

import { useEffect, useRef, useState } from "react";

type Twttr = {
  widgets: { createTweet: (id: string, el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLElement | undefined> };
};
declare global {
  interface Window {
    twttr?: Twttr & { ready?: (cb: (t: Twttr) => void) => void };
  }
}

let loader: Promise<Twttr> | null = null;
function loadWidgets(): Promise<Twttr> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (window.twttr?.widgets) return resolve(window.twttr);
    const s = document.createElement("script");
    s.src = "https://platform.twitter.com/widgets.js";
    s.async = true;
    s.onload = () => (window.twttr?.ready ? window.twttr.ready(resolve) : resolve(window.twttr!));
    s.onerror = () => {
      loader = null;
      reject(new Error("Could not load X widgets"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

export function XEmbed({ tweetId, onState }: { tweetId: string; onState: (s: "ready" | "failed") => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [theme] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // A fresh container per run: createTweet resolves asynchronously, so a stale run
    // (e.g. StrictMode's double effect) must render into a node we've already removed.
    const el = document.createElement("div");
    host.appendChild(el);
    let cancelled = false;
    loadWidgets()
      .then((t) => t.widgets.createTweet(tweetId, el, { theme, dnt: true, align: "center" }))
      .then((node) => !cancelled && onState(node ? "ready" : "failed"))
      .catch(() => !cancelled && onState("failed"));
    return () => {
      cancelled = true;
      el.remove();
    };
    // onState is intentionally excluded: it changes identity each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tweetId, theme]);

  return <div ref={ref} className="w-full [&_.twitter-tweet]:!my-0" />;
}
