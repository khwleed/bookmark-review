"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Section } from "@/lib/client";

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => api.sections().then(setSections).catch((e) => setError(e.message));
  useEffect(() => {
    refresh();
  }, []);

  const run = async (p: Promise<unknown>) => {
    try {
      await p;
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    await refresh();
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = sections.map((s) => s.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(api.reorderSections(ids));
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-6 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sections</h1>
          <p className="text-sm text-[var(--dim)]">The first nine get keys 1–9 in this order. Reorder to change them.</p>
        </div>
        <a className="btn" href="/api/export" download>Export all (JSON)</a>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(api.createSection(name.trim()));
          setName("");
        }}
      >
        <input className="input flex-1" placeholder="New section, e.g. Career" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit">Add</button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <ul className="space-y-2">
        {sections.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
            <span className="w-6 text-center">{s.hotkey ? <kbd>{s.hotkey}</kbd> : <span className="text-[var(--dim)]">–</span>}</span>
            <input
              type="color"
              value={s.color}
              onChange={(e) => run(api.updateSection(s.id, { color: e.target.value }))}
              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              title="Colour"
            />
            <input
              className="input flex-1 border-transparent bg-transparent font-medium"
              defaultValue={s.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && run(api.updateSection(s.id, { name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <Link href={`/sections/${s.id}`} className="btn">
              {s.post_count} posts →
            </Link>
            <div className="flex flex-col">
              <button className="text-xs text-[var(--dim)] hover:text-[var(--fg)] disabled:opacity-20" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">▲</button>
              <button className="text-xs text-[var(--dim)] hover:text-[var(--fg)] disabled:opacity-20" disabled={i === sections.length - 1} onClick={() => move(i, 1)} title="Move down">▼</button>
            </div>
            {confirmDelete === s.id ? (
              <button className="btn !border-red-500 text-red-500" onClick={() => (setConfirmDelete(null), run(api.deleteSection(s.id)))} onBlur={() => setConfirmDelete(null)} autoFocus>
                Confirm
              </button>
            ) : (
              <button className="btn" onClick={() => setConfirmDelete(s.id)} title="Delete (posts only in this section go back to the queue)">🗑</button>
            )}
          </li>
        ))}
        {sections.length === 0 && <li className="text-sm text-[var(--dim)]">No sections yet.</li>}
      </ul>
    </div>
  );
}
