interface RateLimitEntry { count: number; resetAt: number; }
const store = new Map<string, RateLimitEntry>();
export interface RateLimitResult { allowed: boolean; remaining: number; resetIn: number; }
export function rateLimit(key: string, options: { windowMs?: number; max?: number } = {}): RateLimitResult {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 30;
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) { store.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, remaining: max - 1, resetIn: windowMs }; }
  entry.count += 1;
  if (entry.count > max) return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  return { allowed: true, remaining: max - entry.count, resetIn: entry.resetAt - now };
}
setInterval(() => { const now = Date.now(); for (const [k, e] of store.entries()) { if (now > e.resetAt) store.delete(k); } }, 300_000);
