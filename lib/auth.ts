import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { kv } from "./redis";
import { normalizeName, type Admin } from "./types";

export const SESSION_COOKIE = "theo5_sessao";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

interface Account {
  admin: Admin;
  user: string;
  pass: string;
}

function accounts(): Account[] {
  const list: Account[] = [];
  const pairs: [Admin, string | undefined][] = [
    ["Leonardo", process.env.LOGIN_LEONARDO],
    ["Flávia", process.env.LOGIN_FLAVIA],
  ];
  for (const [admin, raw] of pairs) {
    if (!raw) continue;
    const i = raw.indexOf(":");
    if (i <= 0 || i === raw.length - 1) continue;
    list.push({ admin, user: raw.slice(0, i).trim(), pass: raw.slice(i + 1) });
  }
  return list;
}

const sha = (s: string) => createHash("sha256").update(s).digest();
const shaHex = (s: string) => createHash("sha256").update(s).digest("hex");

function safeEqual(a: string, b: string) {
  return timingSafeEqual(sha(a), sha(b));
}

/** Impressão digital da credencial: trocar a senha encerra as sessões antigas. */
function fingerprint(acc: Account) {
  return shaHex(`${acc.user}:${acc.pass}`).slice(0, 16);
}

export function checkCredentials(user: string, pass: string): Admin | null {
  const u = normalizeName(user);
  let found: Admin | null = null;
  for (const acc of accounts()) {
    // compara todas as contas para não vazar tempo
    const okUser = safeEqual(normalizeName(acc.user), u);
    const okPass = safeEqual(acc.pass, pass);
    if (okUser && okPass) found = acc.admin;
  }
  return found;
}

export async function createSession(admin: Admin): Promise<string> {
  const acc = accounts().find((a) => a.admin === admin)!;
  const token = randomBytes(32).toString("base64url");
  await kv().set(
    `theo5:sessao:${shaHex(token)}`,
    JSON.stringify({ admin, fp: fingerprint(acc) }),
    { ex: SESSION_MAX_AGE },
  );
  return token;
}

export async function destroySession(token: string) {
  await kv().del(`theo5:sessao:${shaHex(token)}`);
}

export async function getSessionAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const raw = await kv().get(`theo5:sessao:${shaHex(token)}`);
  if (!raw) return null;
  const data = (typeof raw === "string" ? JSON.parse(raw) : raw) as { admin: Admin; fp: string };
  const acc = accounts().find((a) => a.admin === data.admin);
  if (!acc || fingerprint(acc) !== data.fp) return null;
  return data.admin;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
