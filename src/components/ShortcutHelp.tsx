"use client";

const ROWS: [string, string][] = [
  ["1 – 9", "Sort into that section and go to the next post"],
  ["Shift + 1 – 9", "Select several sections (then Enter, or a plain number)"],
  ["Enter", "Confirm the selected sections"],
  ["S", "Skip: go to the back of the queue"],
  ["X", "Archive / discard"],
  ["Z  or  ⌘Z", "Undo (as many times as you like)"],
  ["N", "Add or edit a note"],
  ["O", "Open the original post"],
  ["Esc", "Clear selection / close"],
  ["?", "Show or hide this help"],
];

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Keyboard shortcuts</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {ROWS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt><kbd>{k}</kbd></dt>
              <dd className="text-[var(--dim)]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
