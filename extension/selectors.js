// Everything that depends on X / Instagram page markup lives here.
// If a site changes its layout and the importer stops finding posts, fix it in this file.
/* exported ADAPTERS */
var ADAPTERS = {
  x: {
    platform: "x",
    // Only offer the button on the bookmarks list. X moved it from /i/bookmarks to
    // /i/history, which has "Bookmarks" and "Likes" tabs — so check the selected tab too.
    isTargetPage() {
      const path = location.pathname;
      if (/^\/i\/bookmarks/.test(path)) return true;
      if (!/^\/i\/history/.test(path) || /likes/i.test(path)) return false;
      const tab = document.querySelector('[role="tab"][aria-selected="true"]');
      return !!tab && /bookmark/i.test(tab.textContent || "");
    },
    collect() {
      const out = [];
      for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
        // The permalink is the link wrapping the <time>. Quoted tweets have their own, later in the DOM.
        const link = article.querySelector('a[href*="/status/"] time')?.closest("a");
        const m = link?.getAttribute("href")?.match(/^\/([^/]+)\/status\/(\d+)/);
        if (!m) continue;
        const text = article.querySelector('[data-testid="tweetText"]')?.innerText?.trim();
        const img = article.querySelector('[data-testid="tweetPhoto"] img, [data-testid="videoThumbnail"] img, video[poster]');
        const thumb = img?.src || img?.poster;
        out.push({
          platform: "x",
          externalId: m[2],
          author: m[1],
          url: `https://x.com/${m[1]}/status/${m[2]}`,
          text: text ? text.slice(0, 5000) : undefined,
          thumbUrl: thumb && thumb.startsWith("https://") ? thumb : undefined,
        });
      }
      return out;
    },
  },

  instagram: {
    platform: "instagram",
    // instagram.com/<you>/saved/ and /saved/all-posts/ or a specific collection.
    isTargetPage: () => /^\/[^/]+\/saved(\/|$)/.test(location.pathname),
    collect() {
      const out = [];
      for (const a of document.querySelectorAll('main a[href*="/p/"], main a[href*="/reel/"]')) {
        const m = a.getAttribute("href")?.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
        if (!m) continue;
        const img = a.querySelector("img");
        out.push({
          platform: "instagram",
          externalId: m[2],
          url: `https://www.instagram.com/${m[1]}/${m[2]}/`,
          // Instagram puts (part of) the caption in the thumbnail's alt text.
          text: img?.alt && !/^Photo by|^Photo shared by/.test(img.alt) ? img.alt.slice(0, 5000) : undefined,
          thumbUrl: img?.src?.startsWith("https://") ? img.src : undefined,
        });
      }
      return out;
    },
  },
};
