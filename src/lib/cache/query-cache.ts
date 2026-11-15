export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}
export function createQueryCache<T>({
  store,
  ttl = 300,
  maxBytes = 64 * 1024 * 1024,
  now = Date.now,
}: {
  store?: CacheStore;
  ttl?: number;
  maxBytes?: number;
  now?: () => number;
}) {
  const memory = new Map<
    string,
    { value: T; expires: number; bytes: number }
  >();
  const pending = new Map<string, Promise<T>>();
  let bytes = 0;
  function remember(key: string, value: T, serialized: string) {
    const size = Buffer.byteLength(serialized);
    if (size > maxBytes) return;
    const old = memory.get(key);
    if (old) bytes -= old.bytes;
    memory.delete(key);
    while (memory.size && (memory.size >= 8 || bytes + size > maxBytes)) {
      const oldest = memory.keys().next().value!;
      bytes -= memory.get(oldest)!.bytes;
      memory.delete(oldest);
    }
    memory.set(key, { value, expires: now() + ttl * 1000, bytes: size });
    bytes += size;
  }
  return async function cached(
    key: string,
    load: () => Promise<T>,
  ): Promise<T> {
    const local = memory.get(key);
    if (local && local.expires > now()) {
      memory.delete(key);
      memory.set(key, local);
      return local.value;
    }
    if (local) {
      bytes -= local.bytes;
      memory.delete(key);
    }
    const running = pending.get(key);
    if (running) return running;
    const task = (async () => {
      if (store) {
        try {
          const saved = await store.get(key);
          if (saved) {
            const value = JSON.parse(saved) as T;
            remember(key, value, saved);
            return value;
          }
        } catch {
          /* Cache failure must not interrupt FIRMS. */
        }
      }
      const value = await load();
      const serialized = JSON.stringify(value);
      remember(key, value, serialized);
      if (store)
        try {
          await store.set(key, serialized, ttl);
        } catch {
          /* Local fallback remains available. */
        }
      return value;
    })();
    pending.set(key, task);
    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  };
}
