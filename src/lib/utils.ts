/** `Object.entries` that keeps the literal key type of a record. */
export function typedEntries<K extends string, V>(record: Record<K, V>): [K, V][] {
  return Object.entries(record) as [K, V][];
}

/** `Object.keys` that keeps the literal key type of a record. */
export function typedKeys<K extends string>(record: Record<K, unknown>): K[] {
  return Object.keys(record) as K[];
}

/**
 * Rounds a coordinate to 2 decimals (~1 km). Precise enough for air data and caching,
 * without handling anyone's exact address.
 */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}
