import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { handle, intParam } from "@/lib/api";
import { listPosts, type PostStatus } from "@/lib/repo";
import type { Platform } from "@/lib/import/types";

const STATUSES = ["inbox", "sorted", "skipped", "archived"];

export const GET = handle((req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const platform = sp.get("platform");
  return Response.json(
    listPosts(getDb(), {
      sectionId: intParam(sp.get("sectionId")),
      status: status && STATUSES.includes(status) ? (status as PostStatus) : undefined,
      platform: platform === "x" || platform === "instagram" ? (platform as Platform) : undefined,
      q: sp.get("q") ?? undefined,
    }),
  );
});
