import { after, NextResponse } from "next/server";
import { listGuests, rateLimit, upsertFromForm } from "@/lib/guests";
import { notifyResponse } from "@/lib/email";
import { computeStats, sanitizeInput } from "@/lib/types";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Origem inválida.", 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Dados inválidos.");
  }
  // Campo invisível para robôs
  if (body.website) return NextResponse.json({ ok: true, isNew: true, guest: null });

  const parsed = sanitizeInput(body, { publico: true });
  if (!parsed.ok) return jsonError(parsed.error);

  try {
    if (!(await rateLimit("rsvp", clientIp(req), 30, 600))) {
      return jsonError("Muitas tentativas. Aguarde alguns minutos e tente de novo.", 429);
    }
    const { guest, isNew, changed } = await upsertFromForm(parsed.value);

    if (changed) {
      // Envia o e-mail depois de responder ao convidado; falhas não afetam a confirmação.
      after(async () => {
        try {
          const stats = computeStats(await listGuests());
          await notifyResponse(guest, stats, isNew);
        } catch (err) {
          console.error("[rsvp] falha ao preparar o aviso:", err);
        }
      });
    }

    return NextResponse.json(
      {
        ok: true,
        isNew,
        guest: {
          responsavel: guest.responsavel,
          status: guest.status,
          pessoas: guest.pessoas,
          observacao: guest.observacao,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[rsvp] erro ao salvar:", err);
    return jsonError("Não foi possível salvar agora. Tente de novo em instantes.", 500);
  }
}
