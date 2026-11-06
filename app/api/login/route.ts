import { NextResponse } from "next/server";
import { checkCredentials, cookieOptions, createSession, SESSION_COOKIE } from "@/lib/auth";
import { rateLimit } from "@/lib/guests";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Origem inválida.", 403);
  let body: { usuario?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Dados inválidos.");
  }
  if (!(await rateLimit("login", clientIp(req), 10, 900))) {
    return jsonError("Muitas tentativas. Aguarde 15 minutos.", 429);
  }
  const admin = checkCredentials(String(body.usuario ?? ""), String(body.senha ?? ""));
  if (!admin) return jsonError("Usuário ou senha incorretos.", 401);

  const token = await createSession(admin);
  const res = NextResponse.json({ ok: true, admin });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return res;
}
