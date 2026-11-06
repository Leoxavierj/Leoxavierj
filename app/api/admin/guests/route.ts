import { NextResponse } from "next/server";
import { createManual, listGuests, NameConflictError } from "@/lib/guests";
import { requireAdmin, jsonError } from "@/lib/http";
import { sanitizeInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;
  return NextResponse.json({ guests: await listGuests() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;
  const parsed = sanitizeInput(await req.json().catch(() => null), { publico: false });
  if (!parsed.ok) return jsonError(parsed.error);
  try {
    const guest = await createManual(parsed.value, admin);
    return NextResponse.json({ guest });
  } catch (err) {
    if (err instanceof NameConflictError) return jsonError(err.message, 409);
    throw err;
  }
}
