/* global ADAPTERS */
(() => {
  const adapter = location.hostname.includes("instagram") ? ADAPTERS.instagram : ADAPTERS.x;
  const BATCH = 40;
  const PAUSE_MS = 1300;
  const IDLE_ROUNDS_TO_STOP = 5;

  let button = null;
  let running = false;
  let stopRequested = false;

  const send = (msg) =>
    new Promise((resolve) => chrome.runtime.sendMessage(msg, (res) => resolve(res ?? { ok: false, error: chrome.runtime.lastError?.message })));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function ensureButton() {
    const want = adapter.isTargetPage();
    if (want && !button) {
      button = document.createElement("button");
      Object.assign(button.style, {
        position: "fixed", right: "20px", bottom: "20px", zIndex: 2147483647,
        padding: "10px 16px", borderRadius: "999px", border: "none", cursor: "pointer",
        font: "600 14px system-ui, sans-serif", color: "#fff", background: "#4f46e5",
        boxShadow: "0 6px 20px rgba(0,0,0,.25)", maxWidth: "360px", textAlign: "left",
      });
      button.addEventListener("click", () => (running ? (stopRequested = true) : run()));
      document.body.appendChild(button);
      setLabel("🔖 Send to Bookmark Review");
    } else if (!want && button && !running) {
      button.remove();
      button = null;
    }
  }

  function setLabel(text, color) {
    if (!button) return;
    button.textContent = text;
    button.style.background = color || "#4f46e5";
  }

  async function run() {
    const ping = await send({ type: "ping" });
    if (!ping?.ok) {
      setLabel("⚠️ App not running on localhost:3000. Start it, then click again", "#dc2626");
      return;
    }

    running = true;
    stopRequested = false;
    const found = new Map(); // externalId -> post (X virtualises the list, so collect as we go)
    let pending = [];
    let added = 0, duplicates = 0, idle = 0, lastHeight = 0;
    let failed = null;

    const flush = async () => {
      if (!pending.length) return;
      const batch = pending;
      pending = [];
      const res = await send({ type: "import", posts: batch });
      if (res?.ok) {
        added += res.added;
        duplicates += res.duplicates;
      } else {
        failed = res?.error || "Import failed";
      }
    };

    window.scrollTo(0, 0);
    await sleep(800);

    while (!stopRequested && !failed) {
      // Bail out if you switch to another tab (e.g. Likes) mid-import.
      if (!adapter.isTargetPage()) {
        stopRequested = true;
        break;
      }
      let fresh = 0;
      for (const post of adapter.collect()) {
        if (found.has(post.externalId)) continue;
        post.bookmarkedIndex = found.size;
        found.set(post.externalId, post);
        pending.push(post);
        fresh++;
      }
      if (pending.length >= BATCH) await flush();

      setLabel(`⏳ ${found.size} found · ${added} new so far (click to stop)`);

      const height = document.documentElement.scrollHeight;
      idle = fresh === 0 && height === lastHeight ? idle + 1 : 0;
      lastHeight = height;
      if (idle >= IDLE_ROUNDS_TO_STOP) break;

      window.scrollBy(0, Math.round(window.innerHeight * 0.85));
      await sleep(PAUSE_MS + Math.random() * 400);
    }

    await flush();
    running = false;
    if (failed) setLabel(`⚠️ ${failed}`, "#dc2626");
    else setLabel(`✅ ${found.size} found · ${added} new · ${duplicates} already imported${stopRequested ? " (stopped)" : ""}`, "#059669");
  }

  // X and Instagram are single-page apps, and switching tabs (Bookmarks ↔ Likes) may not
  // change the URL — so re-check the page on a timer rather than on navigation.
  ensureButton();
  setInterval(ensureButton, 700);
})();
