import { getSessionAdmin } from "@/lib/auth";
import { listGuests } from "@/lib/guests";
import { formatIdade, isCrianca, origemLabel, STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

const cell = (v: string | number) => {
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) return new Response("Não autorizado", { status: 401 });

  const guests = await listGuests();
  const rows: (string | number)[][] = [
    ["Responsável", "Resposta", "Pessoa", "Idade", "Faixa", "Observação", "Origem", "Atualizado em"],
  ];
  const fmtData = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  for (const g of guests) {
    const base = [g.responsavel, STATUS_LABEL[g.status]];
    const tail = [g.observacao, origemLabel(g), fmtData(g.updatedAt)];
    if (g.pessoas.length === 0) rows.push([...base, "", "", "", ...tail]);
    for (const p of g.pessoas) {
      rows.push([...base, p.nome, formatIdade(p), isCrianca(p) ? "criança" : "adulto", ...tail]);
    }
  }

  // ; e BOM UTF-8 para abrir direto no Excel em português
  const csv = "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="convidados-theo-5-anos.csv"',
      "Cache-Control": "no-store",
    },
  });
}
