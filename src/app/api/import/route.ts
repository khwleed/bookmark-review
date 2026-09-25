import { getDb } from "@/lib/db";
import { handle, readJson } from "@/lib/api";
import { ingest } from "@/lib/import/ingest";
import { ImportRequestSchema } from "@/lib/import/types";

export const POST = handle(async (req: Request) => {
  const { source, posts } = await readJson(req, ImportRequestSchema);
  return Response.json(ingest(getDb(), posts, source));
});

/** Lets the extension ping the app to show "connected". */
export const GET = handle(() => Response.json({ ok: true, app: "bookmark-review" }));
