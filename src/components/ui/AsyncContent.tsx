import type { ReactNode } from "react";
import { ErrorNotice, Loading } from "@/components/ui/Status";

interface Props<T> {
  data: T | undefined;
  error?: string;
  onRetry?: () => void;
  loadingLabel: string;
  lines?: number;
  children: (data: T) => ReactNode;
}

/** Renders an error (with retry), a loading placeholder, or the loaded content. */
export function AsyncContent<T>({ data, error, onRetry, loadingLabel, lines, children }: Props<T>) {
  if (error) return <ErrorNotice message={error} onRetry={onRetry} />;
  if (data === undefined) return <Loading label={loadingLabel} lines={lines} />;
  return <>{children(data)}</>;
}
