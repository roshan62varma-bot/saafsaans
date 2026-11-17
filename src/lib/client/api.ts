/** Error carrying a user-safe message from our API. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const FALLBACK_MESSAGE = "Something went wrong. Please check your connection and try again.";

async function errorFrom(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return new ApiError(body.error, response.status);
  } catch {
    // Non-JSON error body: use the generic message.
  }
  return new ApiError(FALLBACK_MESSAGE, response.status);
}

export const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

/**
 * Single fetch wrapper for every API call: aborts propagate untouched, network failures
 * and non-2xx responses become an {@link ApiError} with a user-safe message.
 */
async function request(url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ApiError(FALLBACK_MESSAGE, 0);
  }
  if (!response.ok) throw await errorFrom(response);
  return response;
}

/** Sends JSON and returns the raw response (used for streaming). */
export function postRaw(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return (await (await postRaw(url, body, signal)).json()) as T;
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return (await (await request(url, { signal })).json()) as T;
}

/**
 * Reads a streamed UTF-8 text response, reporting the accumulated text after every chunk.
 * Resolves with the full text.
 */
export async function readTextStream(
  response: Response,
  onText: (textSoFar: string) => void,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(FALLBACK_MESSAGE, response.status);
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
}

export const messageOf = (error: unknown) =>
  error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
