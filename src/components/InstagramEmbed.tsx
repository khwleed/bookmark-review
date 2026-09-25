"use client";

/** Instagram's iframe embed. Cross-origin, so we can only detect load, not "post deleted". */
export function InstagramEmbed({ url, onState }: { url: string; onState: (s: "ready" | "failed") => void }) {
  const src = `${url.replace(/\/?$/, "/")}embed/captioned/`;
  return (
    <iframe
      src={src}
      title="Instagram post"
      className="w-full max-w-[540px] mx-auto block rounded-xl bg-white"
      style={{ height: "min(78vh, 760px)" }}
      loading="eager"
      allow="encrypted-media; picture-in-picture; clipboard-write"
      onLoad={() => onState("ready")}
      onError={() => onState("failed")}
    />
  );
}
