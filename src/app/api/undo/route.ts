import { getDb } from "@/lib/db";
import { handle, readJson } from "@/lib/api";
import { z } from "zod";
import { undo } from "@/lib/repo";

export const POST = handle(async (req: Request) => {
  await readJson(req, z.object({}).passthrough());
  return Response.json({ postId: undo(getDb()) });
});
