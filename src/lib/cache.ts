/**
 * Small in-memory TTL cache with request de-duplication and a size bound.
 *
 * On Vercel Fluid Compute an instance serves many requests, so this saves repeated
 * upstream and model calls. It is per-instance by design: nothing sensitive is
 * stored, and a miss only costs one extra upstream call.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expires: number }>();
  private readonly pending = new Map<string, Promise<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      // Map preserves insertion order, so the first key is the oldest.
      const oldest = this.entries.keys().next().value as string;
      this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expires: this.now() + this.ttlMs });
  }

  /**
   * Returns the cached value, or runs `load` once even if many callers ask
   * concurrently. Failed loads are not cached.
   */
  async getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    const promise = load()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.pending.clear();
  }
}
