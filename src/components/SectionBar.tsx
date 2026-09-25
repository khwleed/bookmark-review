"use client";

import { useState } from "react";
import type { Section } from "@/lib/client";

interface Props {
  sections: Section[];
  selected: number[];
  onPick: (sectionId: number, multi: boolean) => void;
  onCreate: (name: string) => void;
}

export function SectionBar({ sections, selected, onPick, onCreate }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  return (
    // Capped near the card's width so sections wrap into rows instead of one long line.
    <div className="mx-auto flex max-w-[600px] flex-wrap justify-center gap-2">
      {sections.map((s) => {
        const on = selected.includes(s.id);
        return (
          <button
            key={s.id}
            onClick={(e) => onPick(s.id, e.shiftKey)}
            title={s.hotkey ? `Press ${s.hotkey} · Shift+${s.hotkey} to multi-select` : "Click to sort"}
            className="group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all hover:-translate-y-0.5"
            style={{
              borderColor: on ? s.color : "var(--line)",
              background: on ? `${s.color}22` : "var(--card)",
              boxShadow: on ? `0 0 0 2px ${s.color}55` : undefined,
            }}
          >
            {s.hotkey && <kbd>{s.hotkey}</kbd>}
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="font-medium">{s.name}</span>
            <span className="text-xs text-[var(--dim)]">{s.post_count}</span>
          </button>
        );
      })}

      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onCreate(name.trim());
            setName("");
            setAdding(false);
          }}
        >
          <input
            autoFocus
            className="input h-[42px]"
            placeholder="Section name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name && setAdding(false)}
            onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
          />
        </form>
      ) : (
        <button className="rounded-xl border border-dashed border-[var(--line)] px-3 py-2 text-sm text-[var(--dim)] hover:text-[var(--fg)]" onClick={() => setAdding(true)}>
          + New section
        </button>
      )}
    </div>
  );
}
