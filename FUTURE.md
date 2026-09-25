# Future features & open decisions

Ideas and decisions that are parked for later.

## 1. Easier startup (undecided)

**Problem:** starting the app today means opening a terminal, going to the project folder and running `npm run dev`. The goal is to "just go to it".

**Constraints:**
- Nothing should run in the background when the app isn't in use.
- A macOS login item / always-on service was rejected for this reason.
- Your data is safe whichever option is chosen. It lives in `data/bookmarks.db` (SQLite), not in the server.

**Leading proposal: start on demand and stop when idle**
1. **Production build** (`next build` + `next start`): starts in about a second, with no per-page compile wait like dev mode has.
2. **"Bookmark Review" launcher** you open from Spotlight or the Dock. It starts the server in the background if it isn't running, then opens the page in Chrome.
3. **Auto-shutdown when idle:** the server quits after about 30 minutes with no requests. The exact timeout is still to be decided.
4. Helper scripts: `npm run app:update` (rebuild after code changes), plus `app:start` / `app:stop`.

**Open questions:**
- Idle timeout length. 30 minutes? Longer?
- The extension's import button fails with "App not running" if the app is off. Options:
  - Accept it, and open the launcher first.
  - Use Chrome **native messaging**, which lets the extension start the app itself. More setup: a native host manifest plus a small script.
- A friendlier URL: `http://bookmarks.localhost:3000` works in Chrome with no setup.

**Considered and rejected / weaker:**
- macOS login item (launchd, always on): uses resources when not in use.
- Shell alias: still needs a terminal.
- launchd socket activation (starts only when the port is hit): Node can't easily take over the socket, so it would need an extra proxy. Too complex for the benefit.

## 2. More import sources

The import layer is already built for these. Each only has to produce `ImportedPost[]` and call `ingest()` (see `src/lib/import/`).

- **X API sync:** official OAuth bookmark sync. Stable, but X API access is paid.
- **Instagram "Download your information" ZIP:** parse the saved-posts JSON from Instagram's data export. More reliable than scraping.

## 3. Review experience

- **Rename the "Skipped" tab** to something like "Skipped (still in queue)". Skipped posts are *not* removed: they're postponed to the end of the queue, and the current label makes that unclear.
- **Slow-embed hint:** some X embeds (especially video) take about 10 seconds. After a few seconds of loading, show "Taking a while, press O to open the original".
- **Resurface mode:** show one random sorted post each day, so saved posts actually get re-read.
- **AI-suggested section:** pre-highlight the most likely section for each post; you still confirm with a keypress.

## 4. Access & data

- **Phone access:** a hosted version with a login and a hosted database (e.g. Turso/libSQL, which keeps SQLite compatibility), so posts can be sorted on the phone with swipe gestures.
- **Automatic backups:** periodically copy `data/bookmarks.db` (or the JSON export) to iCloud Drive / Google Drive.
