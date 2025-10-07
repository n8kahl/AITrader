type Entry<T> = { value: T; expiresAt: number };

export class TTLCache<T = any> {
  private store = new Map<string, Entry<T>>();
  constructor(private defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) { this.store.delete(key); return undefined; }
    return e.value;
  }

  set(key: string, value: T, ttlMs?: number) {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }
}

// Global shared caches for HTTP JSON responses
export const httpJsonCache = new TTLCache<any>(2500); // 2.5s default

export async function fetchJsonCached(url: string, ttlMs?: number): Promise<any> {
  const hit = httpJsonCache.get(url);
  if (hit !== undefined) return hit;
  const json = await fetch(url as any).then((r:any)=>r.json()).catch(()=>({}));
  httpJsonCache.set(url, json, ttlMs);
  return json;
}

