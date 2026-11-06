import "server-only";
import { Redis } from "@upstash/redis";

/** Subconjunto de comandos usados pelo app. */
export interface Kv {
  get(key: string): Promise<unknown>;
  set(key: string, value: string, opts?: { ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  hget(key: string, field: string): Promise<unknown>;
  hset(key: string, values: Record<string, string>): Promise<unknown>;
  hsetnx(key: string, field: string, value: string): Promise<number>;
  hdel(key: string, field: string): Promise<unknown>;
  hgetall(key: string): Promise<Record<string, unknown> | null>;
}

let client: Kv | null = null;

export function kv(): Kv {
  if (client) return client;
  // A integração Upstash do Vercel cria KV_REST_API_*; a conta Upstash direta usa UPSTASH_REDIS_REST_*.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    client = new Redis({ url, token }) as unknown as Kv;
    return client;
  }
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_MEMORY_DB === "1") {
    console.warn("[redis] Sem credenciais do Upstash: usando banco em memória (apenas para testes).");
    client = memoryKv();
    return client;
  }
  throw new Error(
    "Banco não configurado: defina KV_REST_API_URL e KV_REST_API_TOKEN (integração Upstash do Vercel).",
  );
}

function memoryKv(): Kv {
  const g = globalThis as unknown as { __memkv?: Map<string, unknown> };
  const m = (g.__memkv ??= new Map<string, unknown>());
  const hash = (k: string) => {
    let h = m.get(k) as Map<string, string> | undefined;
    if (!h) m.set(k, (h = new Map()));
    return h;
  };
  return {
    async get(k) { return m.get(k) ?? null; },
    async set(k, v) { m.set(k, v); return "OK"; },
    async del(k) { m.delete(k); return 1; },
    async incr(k) { const n = Number(m.get(k) ?? 0) + 1; m.set(k, n); return n; },
    async expire() { return 1; },
    async hget(k, f) { return hash(k).get(f) ?? null; },
    async hset(k, vals) { for (const [f, v] of Object.entries(vals)) hash(k).set(f, v); return 1; },
    async hsetnx(k, f, v) { const h = hash(k); if (h.has(f)) return 0; h.set(f, v); return 1; },
    async hdel(k, f) { hash(k).delete(f); return 1; },
    async hgetall(k) { const h = m.get(k) as Map<string, string> | undefined; return h && h.size ? Object.fromEntries(h) : null; },
  };
}
