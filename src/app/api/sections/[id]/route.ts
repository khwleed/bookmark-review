import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, intParam, readJson } from "@/lib/api";
import { deleteSection, updateSection } from "@/lib/repo";

const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/sections/[id]">) => {
  const id = intParam((await ctx.params).id)!;
  const patch = await readJson(req, z.object({ name: z.string().trim().min(1).max(60).optional(), color: Color.optional() }));
  updateSection(getDb(), id, patch);
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/sections/[id]">) => {
  deleteSection(getDb(), intParam((await ctx.params).id)!);
  return Response.json({ ok: true });
});
