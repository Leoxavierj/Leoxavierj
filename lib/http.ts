import "server-only";
import { NextResponse } from "next/server";
import { getSessionAdmin } from "./auth";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}

export const jsonError = (error: string, status = 400) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/** Garante que a requisição veio do próprio site (proteção contra CSRF). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // navegadores antigos/GET
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function requireAdmin(req: Request) {
  if (!sameOrigin(req)) return { admin: null, res: jsonError("Origem inválida.", 403) };
  const admin = await getSessionAdmin();
  if (!admin) return { admin: null, res: jsonError("Sessão expirada. Entre novamente.", 401) };
  return { admin, res: null };
}
