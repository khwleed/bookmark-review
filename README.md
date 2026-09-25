# Bookmark Review

Sort your X bookmarks and Instagram saved posts into your own sections, one post at a time, using the keyboard.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Data lives in `data/bookmarks.db` (SQLite). Back it up by copying the file, or use **Export all (JSON)**.

## Import bookmarks

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick `extension/`.
2. With the app running, open X → **History** → **Bookmarks** tab (`x.com/i/history`) or Instagram → profile → **Saved** → **All posts**.
3. Click **🔖 Send to Bookmark Review** (bottom-right). It scrolls through everything and imports as it goes.
   Re-running is safe: duplicates are skipped and sorted posts stay sorted.

You can also paste links on the **Import** page.

If the importer stops finding posts after X/Instagram changes their site, update `extension/selectors.js`.

## Keys (Review screen)

| Key | Action |
|---|---|
| `1`–`9` | Sort into that section, go to the next post |
| `Shift`+`1`–`9`, then `Enter` | Put the post in several sections |
| `S` | Skip (move to the back of the queue) |
| `X` | Archive |
| `Z` / `⌘Z` | Undo (repeatable) |
| `N` | Note |
| `O` | Open original |
| `?` | Help |

Sections get keys 1–9 by their order on the **Sections** page.

## Adding import sources later

Every importer produces `ImportedPost[]` (`src/lib/import/types.ts`) and calls `ingest()` (`src/lib/import/ingest.ts`).
An X API sync or an Instagram "Download your information" ZIP parser only has to do the same.

## Tests

```bash
npm test
```
