import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Parse a JSON body. Requiring application/json means a random website can't
 * fire a "simple" cross-origin POST at this localhost server — the browser would
 * need a CORS preflight, which we never approve.
 */
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "Expected application/json");
  }
  const parsed = schema.safeParse(await req.json().catch(() => undefined));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return parsed.data;
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  };
}

export function intParam(v: string | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new HttpError(400, `Invalid number: ${v}`);
  return n;
}
