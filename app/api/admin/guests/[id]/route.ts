import { NextResponse } from "next/server";
import { deleteGuest, NameConflictError, updateGuest } from "@/lib/guests";
import { requireAdmin, jsonError } from "@/lib/http";
import { sanitizeInput } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;
  const { id } = await params;
  const parsed = sanitizeInput(await req.json().catch(() => null), { publico: false });
  if (!parsed.ok) return jsonError(parsed.error);
  try {
    const guest = await updateGuest(id, parsed.value);
    if (!guest) return jsonError("Convidado não encontrado.", 404);
    return NextResponse.json({ guest });
  } catch (err) {
    if (err instanceof NameConflictError) return jsonError(err.message, 409);
    throw err;
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;
  const { id } = await params;
  const ok = await deleteGuest(id);
  if (!ok) return jsonError("Convidado não encontrado.", 404);
  return NextResponse.json({ ok: true });
}
