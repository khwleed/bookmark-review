import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { handle, intParam } from "@/lib/api";
import { getQueue, type QueueOrder } from "@/lib/repo";
import type { Platform } from "@/lib/import/types";

export const GET = handle((req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const platform = sp.get("platform");
  const order = sp.get("order");
  return Response.json(
    getQueue(getDb(), {
      platform: platform === "x" || platform === "instagram" ? (platform as Platform) : undefined,
      order: order === "oldest" || order === "shuffle" ? (order as QueueOrder) : "newest",
      seed: intParam(sp.get("seed")),
      pin: intParam(sp.get("pin")),
      limit: 3,
    }),
  );
});
