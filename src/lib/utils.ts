/** `Object.entries` that keeps the literal key type of a record. */
export function typedEntries<K extends string, V>(record: Record<K, V>): [K, V][] {
  return Object.entries(record) as [K, V][];
}

/** `Object.keys` that keeps the literal key type of a record. */
export function typedKeys<K extends string>(record: Record<K, unknown>): K[] {
  return Object.keys(record) as K[];
}
