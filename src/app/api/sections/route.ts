import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, readJson } from "@/lib/api";
import { createSection, listSections, reorderSections } from "@/lib/repo";

export const GET = handle(() => Response.json(listSections(getDb())));

export const POST = handle(async (req: Request) => {
  const { name, color } = await readJson(req, z.object({ name: z.string().trim().min(1).max(60), color: z.string().optional() }));
  return Response.json(createSection(getDb(), name, color));
});

/** Reorder: body is the full list of section ids in their new order. */
export const PUT = handle(async (req: Request) => {
  const { ids } = await readJson(req, z.object({ ids: z.array(z.number().int()) }));
  reorderSections(getDb(), ids);
  return Response.json(listSections(getDb()));
});
