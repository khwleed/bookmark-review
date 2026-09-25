import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, readJson } from "@/lib/api";
import { archivePost, editPostSections, restorePost, setNote, skipPost, sortPost } from "@/lib/repo";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sort"), postId: z.number().int(), sectionIds: z.array(z.number().int()).min(1) }),
  z.object({ action: z.literal("sections"), postId: z.number().int(), sectionIds: z.array(z.number().int()) }),
  z.object({ action: z.literal("skip"), postId: z.number().int() }),
  z.object({ action: z.literal("archive"), postId: z.number().int() }),
  z.object({ action: z.literal("restore"), postId: z.number().int() }),
  z.object({ action: z.literal("note"), postId: z.number().int(), note: z.string().max(2000) }),
]);

export const POST = handle(async (req: Request) => {
  const body = await readJson(req, Body);
  const db = getDb();
  switch (body.action) {
    case "sort": sortPost(db, body.postId, body.sectionIds); break;
    case "sections": editPostSections(db, body.postId, body.sectionIds); break;
    case "skip": skipPost(db, body.postId); break;
    case "archive": archivePost(db, body.postId); break;
    case "restore": restorePost(db, body.postId); break;
    case "note": setNote(db, body.postId, body.note); break;
  }
  return Response.json({ ok: true });
});
