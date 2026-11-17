import { UPSTREAM_TIMEOUT_MS } from "@/lib/constants";

/** Raised when an upstream service fails; the message is safe to show users. */
export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** GET a JSON document with a hard timeout. Never forwards upstream error bodies. */
export async function fetchJson(url: string, timeoutMs = UPSTREAM_TIMEOUT_MS): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "application/json" },
    });
  } catch {
    throw new UpstreamError("The air-quality service did not respond. Please try again.", 504);
  }
  if (!response.ok) {
    throw new UpstreamError("The air-quality service is unavailable right now.", 502);
  }
  return response.json();
}
