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

/** Sends JSON and returns the raw response, throwing {@link ApiError} on non-2xx. */
export async function postRaw(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(FALLBACK_MESSAGE, 0);
  }
  if (!response.ok) throw await errorFrom(response);
  return response;
}

export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return (await (await postRaw(url, body, signal)).json()) as T;
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(FALLBACK_MESSAGE, 0);
  }
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as T;
}

export const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

export const messageOf = (error: unknown) =>
  error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
