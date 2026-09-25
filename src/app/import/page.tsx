"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { parsePostUrl } from "@/lib/import/types";

export default function ImportPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);

  const refresh = () => api.stats().then(setStats);
  useEffect(() => {
    refresh();
  }, []);

  const lines = text.split(/\s+/).filter(Boolean);
  const parsed = lines.map(parsePostUrl).filter((p) => p !== null);

  const submit = async () => {
    try {
      const r = await api.import(parsed, "manual");
      setResult(`Added ${r.added} · ${r.duplicates} already here · ${lines.length - parsed.length} not recognised`);
      setText("");
      refresh();
    } catch (e) {
      setResult((e as Error).message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Import bookmarks</h1>
        {stats && (
          <p className="text-sm text-[var(--dim)] mt-1">
            {stats.total} posts total · {(stats.byStatus.inbox ?? 0) + (stats.byStatus.skipped ?? 0)} waiting ·{" "}
            {stats.byStatus.sorted ?? 0} sorted · {stats.byStatus.archived ?? 0} archived
          </p>
        )}
      </div>

      <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5">
        <h2 className="font-semibold">1 · Browser extension (recommended)</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Open <code>chrome://extensions</code> and turn on <b>Developer mode</b> (top right).</li>
          <li>Click <b>Load unpacked</b> and pick the <code>extension/</code> folder in this project.</li>
          <li>Keep this app running (<code>npm run dev</code>).</li>
          <li>
            Go to X → <a className="underline" href="https://x.com/i/history" target="_blank" rel="noreferrer">History</a> → <b>Bookmarks</b> tab, or your
            Instagram profile → <b>Saved</b> → <b>All posts</b>.
          </li>
          <li>Click the <b>“Send to Bookmark Review”</b> button in the bottom-right corner. It scrolls through everything and imports as it goes.</li>
        </ol>
        <p className="text-xs text-[var(--dim)]">Running it again is safe: posts you already have are skipped, and posts you already sorted stay sorted.</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5">
        <h2 className="font-semibold">2 · Paste links</h2>
        <textarea
          className="input w-full font-mono text-xs"
          rows={6}
          placeholder={"https://x.com/someone/status/123…\nhttps://www.instagram.com/p/AbC123/"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button className="btn" disabled={parsed.length === 0} onClick={submit}>
            Import {parsed.length || ""} link{parsed.length === 1 ? "" : "s"}
          </button>
          {result && <span className="text-sm text-[var(--dim)]">{result}</span>}
        </div>
      </section>

      <section className="space-y-2 text-sm text-[var(--dim)]">
        <h2 className="font-semibold text-[var(--fg)]">Coming later</h2>
        <p>X API sync and Instagram “Download your information” ZIP import. Both plug into the same import endpoint.</p>
        <a className="btn" href="/api/export" download>Back up everything (JSON)</a>
      </section>
    </div>
  );
}
