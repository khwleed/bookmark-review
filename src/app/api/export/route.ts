import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { handle, intParam } from "@/lib/api";
import { exportAllJson, exportSectionMarkdown, listSections } from "@/lib/repo";

export const GET = handle((req: NextRequest) => {
  const db = getDb();
  const sectionId = intParam(req.nextUrl.searchParams.get("sectionId"));
  const date = new Date().toISOString().slice(0, 10);

  if (sectionId !== undefined) {
    const name = listSections(db).find((s) => s.id === sectionId)?.name ?? "section";
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    return new Response(exportSectionMarkdown(db, sectionId), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${slug}-${date}.md"`,
      },
    });
  }
  return new Response(JSON.stringify(exportAllJson(db), null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="bookmark-review-${date}.json"`,
    },
  });
});
