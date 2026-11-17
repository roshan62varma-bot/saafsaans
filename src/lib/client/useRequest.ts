"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { isAbort, messageOf } from "@/lib/client/api";

interface RequestState<T> {
  key: string | null;
  data?: T;
  error?: string;
}

export interface RequestResult<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  retry: () => void;
}

/**
 * Runs `run` whenever `key` changes, aborting the previous request. State is tagged with
 * the key it belongs to, so stale responses never show and no state is set synchronously
 * inside the effect.
 */
export function useRequest<T>(
  key: string | null,
  run: (signal: AbortSignal) => Promise<T>,
): RequestResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RequestState<T>>({ key: null });
  const requestKey = key === null ? null : `${attempt}:${key}`;
  const execute = useEffectEvent(run);

  useEffect(() => {
    if (requestKey === null) return;
    const controller = new AbortController();
    execute(controller.signal).then(
      (data) => setState({ key: requestKey, data }),
      (error: unknown) => {
        if (!isAbort(error)) setState({ key: requestKey, error: messageOf(error) });
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const current = requestKey !== null && state.key === requestKey;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: requestKey !== null && !current,
    retry,
  };
}
