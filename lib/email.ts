import "server-only";
import { formatIdade, STATUS_LABEL, type Guest, type Stats } from "./types";
import { siteUrl } from "./site";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Envia o aviso de resposta. Nunca lança erro: só registra no log. */
export async function notifyResponse(guest: Guest, stats: Stats, isNew: boolean): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = (process.env.NOTIFY_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!apiKey || to.length === 0) {
      console.warn("[email] RESEND_API_KEY ou NOTIFY_EMAILS ausente; aviso não enviado.");
      return;
    }
    const from = process.env.EMAIL_FROM || "Théo 5 anos <onboarding@resend.dev>";
    const resposta = guest.status === "vai" ? "vai" : "não vai";
    const subject = `Théo 5 anos: ${guest.responsavel} ${resposta}`;
    const lista = `${siteUrl()}/lista`;

    const pessoasTxt = guest.status === "vai"
      ? guest.pessoas.map((p) => `  - ${p.nome} (${formatIdade(p)})`).join("\n")
      : "  -";
    const text = [
      isNew ? "Nova resposta recebida." : "Resposta alterada.",
      "",
      `Responsável: ${guest.responsavel}`,
      `Resposta: ${STATUS_LABEL[guest.status]}`,
      `Pessoas:\n${pessoasTxt}`,
      `Observação: ${guest.observacao || "-"}`,
      "",
      `Total de pessoas confirmadas até agora: ${stats.pessoas} (${stats.criancas} crianças, ${stats.adultos} adultos)`,
      "",
      `Ver lista: ${lista}`,
    ].join("\n");

    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p style="margin:0 0 12px"><b>${isNew ? "Nova resposta recebida." : "Resposta alterada."}</b></p>
<p style="margin:0">Responsável: <b>${esc(guest.responsavel)}</b><br>
Resposta: <b>${STATUS_LABEL[guest.status]}</b></p>
${guest.status === "vai" && guest.pessoas.length
  ? `<p style="margin:12px 0 0">Pessoas:</p><ul style="margin:4px 0">${guest.pessoas
      .map((p) => `<li>${esc(p.nome)} (${formatIdade(p)})</li>`)
      .join("")}</ul>`
  : ""}
<p style="margin:12px 0 0">Observação: ${guest.observacao ? esc(guest.observacao) : "-"}</p>
<p style="margin:12px 0 0">Total de pessoas confirmadas até agora: <b>${stats.pessoas}</b> (${stats.criancas} crianças, ${stats.adultos} adultos)</p>
<p style="margin:16px 0 0"><a href="${lista}">Abrir a lista</a></p>
</div>`;

    // Um envio por destinatário: se um falhar, o outro ainda recebe.
    const results = await Promise.allSettled(
      to.map(async (addr) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [addr], subject, text, html }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`${addr}: HTTP ${res.status} ${await res.text()}`);
      }),
    );
    for (const r of results) {
      if (r.status === "rejected") console.error("[email] falha no envio:", r.reason);
    }
  } catch (err) {
    console.error("[email] erro inesperado:", err);
  }
}
