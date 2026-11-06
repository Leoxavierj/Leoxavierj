import { NextResponse } from "next/server";
import { aiEnabled, parseGuestText } from "@/lib/ai";
import { requireAdmin, jsonError } from "@/lib/http";
import { sanitizeInput } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;
  if (!aiEnabled()) return jsonError("Preenchimento automático desativado.", 404);
  const body = await req.json().catch(() => null);
  const text = String(body?.texto ?? "").trim();
  if (!text) return jsonError("Escreva algo sobre o convidado.");
  try {
    const raw = await parseGuestText(text);
    const parsed = sanitizeInput(raw, { publico: false });
    if (!parsed.ok) return jsonError(`Não consegui entender: ${parsed.error}`);
    return NextResponse.json({ campos: parsed.value });
  } catch (err) {
    console.error("[parse] erro:", err);
    return jsonError("Não consegui preencher automaticamente. Preencha os campos à mão.", 502);
  }
}
