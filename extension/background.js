// The content script can't call localhost (page CSP), so it hands batches to us.
const APP = "http://localhost:3000";

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "ping") {
    fetch(`${APP}/api/import`)
      .then((r) => reply({ ok: r.ok }))
      .catch(() => reply({ ok: false }));
    return true;
  }
  if (msg?.type === "import") {
    fetch(`${APP}/api/import`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "scraper", posts: msg.posts }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        reply(r.ok ? { ok: true, ...data } : { ok: false, error: data.error || `HTTP ${r.status}` });
      })
      .catch((e) => reply({ ok: false, error: `Can't reach ${APP}. Is the app running? (${e.message})` }));
    return true; // keep the channel open for the async reply
  }
});
