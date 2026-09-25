import { getDb } from "@/lib/db";
import { handle } from "@/lib/api";
import { getStats } from "@/lib/repo";

export const GET = handle(() => Response.json(getStats(getDb())));
