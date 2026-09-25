"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, displayAuthor, type Platform, type Post, type QueueOrder, type Section } from "@/lib/client";
import { PostEmbed } from "@/components/PostEmbed";
import { SectionBar } from "@/components/SectionBar";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { digitFromEvent, useHotkeys } from "@/hooks/useHotkeys";

interface Filters {
  platform: Platform | "";
  order: QueueOrder;
  seed: number;
}

const FILTERS_KEY = "br:filters";
const DEFAULT_FILTERS: Filters = { platform: "", order: "newest", seed: 1 };

function loadFilters(): Filters {
  try {
    return { ...DEFAULT_FILTERS, ...JSON.parse(localStorage.getItem(FILTERS_KEY) ?? "{}") };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export default function ReviewPage() {
  const [filters, setFilters] = useState<Filters | null>(null);
  const [queue, setQueue] = useState<Post[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [sections, setSections] = useState<Section[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null); // non-null = editor open
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [today, setToday] = useState<Record<string, number>>({});

  // Actions are chained so the server sees them in order (undo depends on it).
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  // Posts acted on whose follow-up reload hasn't landed yet — hide them from stale results.
  const inFlight = useRef(new Set<number>());
  const loadSeq = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const current = queue?.[0];

  const flash = useCallback((text: string, error = false) => {
    setToast({ text, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), error ? 5000 : 2200);
  }, []);

  const refreshSections = useCallback(() => api.sections().then(setSections), []);

  const load = useCallback(
    async (f: Filters, pin?: number) => {
      const seq = ++loadSeq.current;
      const res = await api.queue({ ...f, pin });
      if (seq !== loadSeq.current) return;
      setQueue(res.posts.filter((p) => !inFlight.current.has(p.id)));
      setRemaining(res.remaining);
      if (res.remaining === 0) api.stats().then((s) => setToday(s.today));
    },
    [],
  );

  // Initial load (filters live in localStorage, so read them on the client only).
  useEffect(() => {
    const f = loadFilters();
    // localStorage only exists on the client, so this can't be a lazy initial state (hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(f);
    load(f).catch((e) => flash(e.message, true));
    refreshSections();
  }, [load, refreshSections, flash]);

  const updateFilters = (patch: Partial<Filters>) => {
    const f = { ...filters!, ...patch };
    setFilters(f);
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(f));
    } catch {}
    load(f);
  };

  /** Advance immediately, then persist + reload in the background. */
  const act = (
    post: Post,
    body: Parameters<typeof api.review>[0],
    message: string,
    leavesQueue = true,
  ) => {
    inFlight.current.add(post.id);
    setQueue((q) => q?.filter((p) => p.id !== post.id) ?? q);
    if (leavesQueue) setRemaining((r) => Math.max(0, r - 1));
    setSelected([]);
    flash(`${message} · Z to undo`);
    chain.current = chain.current
      .then(() => api.review(body))
      .then(() => {
        inFlight.current.delete(post.id);
        return Promise.all([load(filters!), refreshSections()]);
      })
      .catch((e) => {
        inFlight.current.delete(post.id);
        flash(`Couldn’t save: ${e.message}`, true);
        load(filters!);
      });
  };

  const sortInto = (ids: number[]) => {
    if (!current || ids.length === 0) return;
    const names = sections.filter((s) => ids.includes(s.id)).map((s) => s.name);
    act(current, { action: "sort", postId: current.id, sectionIds: ids }, `→ ${names.join(" + ")}`);
  };

  const pickSection = (id: number, multi: boolean) => {
    if (multi) setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
    else sortInto([...new Set([...selected, id])]);
  };

  const skip = () => current && act(current, { action: "skip", postId: current.id }, "Skipped", false);
  const archive = () => current && act(current, { action: "archive", postId: current.id }, "Archived");

  const undo = () => {
    chain.current = chain.current
      .then(() => api.undo())
      .then(async ({ postId }) => {
        if (postId == null) return flash("Nothing to undo");
        flash("Undone");
        setSelected([]);
        await Promise.all([load(filters!, postId), refreshSections()]);
      })
      .catch((e) => flash(e.message, true));
  };

  const saveNote = () => {
    if (!current || note === null) return;
    const text = note;
    setNote(null);
    setQueue((q) => q?.map((p) => (p.id === current.id ? { ...p, note: text.trim() || null } : p)) ?? q);
    chain.current = chain.current
      .then(() => api.review({ action: "note", postId: current.id, note: text }))
      .then(() => flash("Note saved"))
      .catch((e) => flash(e.message, true));
  };

  const createSection = async (name: string) => {
    try {
      await api.createSection(name);
      await refreshSections();
    } catch (e) {
      flash((e as Error).message, true);
    }
  };

  useHotkeys((e) => {
    if (e.metaKey && e.key.toLowerCase() === "z") return undo(), true;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "?") return setHelp((h) => !h), true;
    if (e.key === "Escape") return setHelp(false), setSelected([]), true;
    if (help) return;
    const key = e.key.toLowerCase();
    if (key === "z") return undo(), true;
    if (!current) return;

    const digit = digitFromEvent(e);
    if (digit) {
      const section = sections.find((s) => s.hotkey === digit);
      if (!section) return flash(`No section on key ${digit} yet`), true;
      return pickSection(section.id, e.shiftKey), true;
    }
    if (e.key === "Enter" && selected.length) return sortInto(selected), true;
    if (key === "s") return skip(), true;
    if (key === "x") return archive(), true;
    if (key === "n") return setNote(current.note ?? ""), true;
    if (key === "o") return window.open(current.url, "_blank", "noopener"), true;
  });

  if (!filters || queue === null) {
    return <div className="m-auto text-[var(--dim)]">Loading…</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar: progress + filters */}
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 text-sm">
        <span className="font-medium">
          {remaining} left
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select className="input" value={filters.platform} onChange={(e) => updateFilters({ platform: e.target.value as Platform | "" })}>
            <option value="">X + Instagram</option>
            <option value="x">X only</option>
            <option value="instagram">Instagram only</option>
          </select>
          <select className="input" value={filters.order} onChange={(e) => updateFilters({ order: e.target.value as QueueOrder })}>
            <option value="newest">Newest saved first</option>
            <option value="oldest">Oldest saved first</option>
            <option value="shuffle">Shuffle</option>
          </select>
          {filters.order === "shuffle" && (
            <button className="btn" onClick={() => updateFilters({ seed: Math.floor(Math.random() * 1e9) })} title="Reshuffle">
              🔀
            </button>
          )}
          <button className="btn" onClick={() => setHelp(true)} title="Keyboard shortcuts">
            <kbd>?</kbd>
          </button>
        </div>
      </div>

      {current ? (
        <>
          {/* Card area. The next posts render hidden underneath so they're already loaded. */}
          <div className="relative flex-1 px-4 pb-4 overflow-y-auto">
            {queue.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                data-post-id={p.id}
                aria-hidden={i > 0}
                inert={i > 0}
                // Don't use `visibility: hidden` for the preloads: X's widget sets
                // visibility:visible on its own iframe, which overrides the parent and
                // painted the *next* tweet over the current one. Opacity and overflow
                // clipping can't be overridden by children.
                className={
                  i === 0
                    ? "relative z-10 mx-auto max-w-[560px]"
                    : "absolute inset-x-4 top-0 -z-10 mx-auto max-w-[560px] h-0 overflow-hidden opacity-0 pointer-events-none"
                }
              >
                <PostEmbed post={p} />
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="sticky bottom-0 z-20 border-t border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur px-4 py-4 space-y-3">
            <div className="mx-auto max-w-[560px] flex items-center gap-2 text-sm">
              <span className="text-[var(--dim)] truncate">
                {current.platform === "x" ? "𝕏" : "📷"} {displayAuthor(current)}
                {current.skip_count > 0 && ` · skipped ${current.skip_count}×`}
              </span>
              {current.note && note === null && (
                <button className="truncate text-left italic text-[var(--dim)] hover:text-[var(--fg)]" onClick={() => setNote(current.note ?? "")}>
                  📝 {current.note}
                </button>
              )}
            </div>

            {note !== null && (
              <div className="mx-auto max-w-[560px]">
                <textarea
                  autoFocus
                  className="input w-full"
                  rows={2}
                  placeholder="Why did you save this? (Enter to save, Esc to cancel)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      saveNote();
                    }
                    if (e.key === "Escape") setNote(null);
                  }}
                />
              </div>
            )}

            {sections.length === 0 && (
              <p className="text-center text-sm text-[var(--dim)]">
                Create your first section, e.g. “Career” or “Mindset”. Sections get keys 1–9 in order.
              </p>
            )}
            <SectionBar sections={sections} selected={selected} onPick={pickSection} onCreate={createSection} />

            <div className="flex flex-wrap justify-center gap-2 text-sm">
              {selected.length > 0 && (
                <button className="btn" onClick={() => sortInto(selected)} style={{ borderColor: "var(--accent)" }}>
                  <kbd>Enter</kbd> Save to {selected.length} sections
                </button>
              )}
              <button className="btn" onClick={skip}><kbd>S</kbd> Skip</button>
              <button className="btn" onClick={archive}><kbd>X</kbd> Archive</button>
              <button className="btn" onClick={undo}><kbd>Z</kbd> Undo</button>
              <button className="btn" onClick={() => setNote(current.note ?? "")}><kbd>N</kbd> Note</button>
              <a className="btn" href={current.url} target="_blank" rel="noreferrer"><kbd>O</kbd> Open</a>
            </div>
          </div>
        </>
      ) : (
        <Done remaining={remaining} today={today} onUndo={undo} />
      )}

      {toast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-40 rounded-full px-4 py-2 text-sm shadow-lg ${toast.error ? "bg-red-600 text-white" : "bg-[var(--fg)] text-[var(--bg)]"}`}
        >
          {toast.text}
        </div>
      )}
      {help && <ShortcutHelp onClose={() => setHelp(false)} />}
    </div>
  );
}

function Done({ remaining, today, onUndo }: { remaining: number; today: Record<string, number>; onUndo: () => void }) {
  if (remaining > 0) return <div className="m-auto text-[var(--dim)]">Loading next post…</div>;
  const sorted = today.sorted ?? 0;
  const archived = today.archived ?? 0;
  return (
    <div className="m-auto max-w-md text-center space-y-4 p-6">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-semibold">Queue is empty</h1>
      {sorted + archived > 0 ? (
        <p className="text-[var(--dim)]">Today you sorted {sorted} and archived {archived}.</p>
      ) : (
        <p className="text-[var(--dim)]">No bookmarks waiting. Import some to get started.</p>
      )}
      <div className="flex justify-center gap-2">
        <Link href="/import" className="btn">Import bookmarks</Link>
        <Link href="/sections" className="btn">Browse sections</Link>
        <button className="btn" onClick={onUndo}><kbd>Z</kbd> Undo last</button>
      </div>
    </div>
  );
}
