import type { z } from "zod";
import { UpstreamError } from "@/lib/http";
import { type RateLimiter, clientKey } from "@/lib/security/rateLimit";

/** Largest JSON body any route accepts. A full profile plus chat history is well under this. */
export const MAX_BODY_BYTES = 32 * 1024;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export interface ApiErrorBody {
  error: string;
  issues?: { path: string; message: string }[];
}

export function jsonError(
  status: number,
  error: string,
  extra: Omit<ApiErrorBody, "error"> = {},
  headers: HeadersInit = {},
): Response {
  return Response.json({ error, ...extra } satisfies ApiErrorBody, {
    status,
    headers: { ...NO_STORE, ...headers },
  });
}

export function jsonOk<T>(data: T, headers: HeadersInit = NO_STORE): Response {
  return Response.json(data, { headers });
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

/** Formats Zod issues for API clients without echoing submitted values. */
export function toIssues(error: z.ZodError) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

/** Reads, size-checks, JSON-parses and validates a request body. */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<Parsed<z.infer<S>>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, response: jsonError(415, "Content-Type must be application/json.") };
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: jsonError(413, "Request is too large.") };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { ok: false, response: jsonError(413, "Request is too large.") };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, "Request body is not valid JSON.") };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      response: jsonError(400, "Some details are missing or invalid.", {
        issues: toIssues(result.error),
      }),
    };
  }
  return { ok: true, data: result.data };
}

/** Applies a rate limit; returns a 429 response when exceeded. */
export function enforceRateLimit(request: Request, limiter: RateLimiter): Response | null {
  const result = limiter.check(clientKey(request.headers));
  if (result.ok) return null;
  return jsonError(
    429,
    "You're sending requests too quickly. Please wait a moment and try again.",
    {},
    { "Retry-After": String(result.retryAfterSec) },
  );
}

/** Maps unexpected failures to safe responses; never leaks stack traces or upstream bodies. */
export function handleRouteError(error: unknown): Response {
  if (error instanceof UpstreamError) return jsonError(error.status, error.message);
  console.error("Unhandled route error", error instanceof Error ? error.name : "unknown");
  return jsonError(500, "Something went wrong on our side. Please try again.");
}

interface JsonRouteOptions<S extends z.ZodType> {
  limiter: RateLimiter;
  schema: S;
  handle: (body: z.infer<S>) => Promise<Response>;
}

/**
 * Builds a POST handler with the standard pipeline every JSON route shares:
 * rate limit → size-capped, validated body → handler → safe error mapping.
 */
export function jsonRoute<S extends z.ZodType>({ limiter, schema, handle }: JsonRouteOptions<S>) {
  return async function POST(request: Request): Promise<Response> {
    const limited = enforceRateLimit(request, limiter);
    if (limited) return limited;
    const body = await parseJsonBody(request, schema);
    if (!body.ok) return body.response;
    try {
      return await handle(body.data);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}
