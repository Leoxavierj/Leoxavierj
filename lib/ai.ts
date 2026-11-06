import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GuestInput, Pessoa, Status } from "./types";

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["responsavel", "status", "adultos", "criancas", "pessoas", "observacao"],
  properties: {
    responsavel: { type: "string", description: "Nome do responsável pela família/grupo" },
    status: { type: "string", enum: ["vai", "nao_vai", "aguardando"] },
    adultos: { type: "integer", description: "Total de adultos citados, incluindo o responsável" },
    criancas: { type: "integer", description: "Total de crianças/bebês citados" },
    pessoas: {
      type: "array",
      description: "Uma entrada para CADA pessoa contada em adultos + criancas",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "tipo", "idade", "unidade"],
        properties: {
          nome: { type: "string" },
          tipo: { type: "string", enum: ["adulto", "crianca"] },
          idade: { anyOf: [{ type: "integer" }, { type: "null" }] },
          unidade: { type: "string", enum: ["anos", "meses"] },
        },
      },
    },
    observacao: { type: "string" },
  },
} as const;

const SYSTEM = `Você ajuda a organizar a lista de convidados do aniversário de 5 anos do Théo.
Recebe uma anotação curta em português sobre um convidado e devolve os campos do cadastro.

Regras:
- responsavel: o nome principal citado (ex.: "Tia Marta"). Mantenha apelidos e parentescos como escritos.
- status: "vai" se confirmou/vai/vem; "nao_vai" se não vai/não pode/recusou; "aguardando" se ainda não respondeu, talvez, vai confirmar ou não há informação.
- adultos e criancas: quantas pessoas de cada tipo foram citadas no total. "2 adultos" INCLUI o responsável. Se nada for dito sobre quantidade, conte só o responsável (1 adulto).
- pessoas: TODAS as pessoas contadas, sem exceção — o tamanho da lista deve ser adultos + criancas.
  - A primeira é o próprio responsável (adulto, a menos que o texto diga o contrário).
  - Nome desconhecido: "Acompanhante de <responsável>" para adultos e "Criança de <responsável>" para crianças; numere se houver mais de um ("Acompanhante 2 de Tia Marta"). Nunca deixe nome vazio.
  - idade: inteiro se informada; null se não informada.
  - Bebês com idade em meses: unidade "meses"; caso contrário "anos".
  - Criança sem idade: idade null e mencione na observação que falta a idade.
- Se status for "nao_vai": adultos = 0, criancas = 0 e pessoas = [].
- observacao: detalhes úteis que não caibam nos outros campos. Vazio se nada.

Exemplos:
"Tia Marta, 2 adultos, confirmou" -> adultos 2, criancas 0, pessoas: Tia Marta (adulto, null), Acompanhante de Tia Marta (adulto, null)
"Família Souza, 2 adultos e 1 criança de 3 anos, vem" -> adultos 2, criancas 1, pessoas: Família Souza (adulto, null), Acompanhante de Família Souza (adulto, null), Criança de Família Souza (crianca, 3 anos)
"João e Pedro (7) vão" -> adultos 1, criancas 1, pessoas: João (adulto, null), Pedro (crianca, 7 anos)`;

interface Resposta {
  responsavel: string;
  status: Status;
  adultos: number;
  criancas: number;
  pessoas: (Pessoa & { tipo: "adulto" | "crianca" })[];
  observacao: string;
}

/** Garante que ninguém citado fique de fora e que todo mundo tenha nome. */
export function completarPessoas(r: Resposta): GuestInput {
  const resp = (r.responsavel || "").trim() || "Convidado";
  const base = { responsavel: resp, status: r.status, observacao: r.observacao || "" };
  if (r.status === "nao_vai") return { ...base, pessoas: [] };

  const lista = (r.pessoas || []).map((p) => ({ ...p, nome: (p.nome || "").trim() }));
  const conta = (t: "adulto" | "crianca") => lista.filter((p) => p.tipo === t).length;
  const temResp = lista.some((p) => p.nome.toLowerCase() === resp.toLowerCase());

  // Completa adultos faltando
  let nAd = conta("adulto");
  const alvoAd = Math.max(0, Math.min(30, r.adultos || 0));
  if (nAd < alvoAd && !temResp) {
    lista.unshift({ nome: resp, tipo: "adulto", idade: null, unidade: "anos" });
    nAd++;
  }
  while (nAd < alvoAd) {
    nAd++;
    // entra logo depois do último adulto, antes das crianças
    let pos = 0;
    lista.forEach((p, i) => { if (p.tipo === "adulto") pos = i + 1; });
    lista.splice(pos, 0, { nome: "", tipo: "adulto", idade: null, unidade: "anos" });
  }
  // Completa crianças faltando
  let nCr = conta("crianca");
  const alvoCr = Math.max(0, Math.min(30, r.criancas || 0));
  while (nCr < alvoCr) {
    nCr++;
    lista.push({ nome: "", tipo: "crianca", idade: null, unidade: "anos" });
  }
  // Nenhuma pessoa: pelo menos o responsável
  if (lista.length === 0) lista.push({ nome: resp, tipo: "adulto", idade: null, unidade: "anos" });

  // Preenche nomes vazios
  let ia = 0;
  let ic = 0;
  const totAdSemNome = lista.filter((p) => !p.nome && p.tipo === "adulto").length;
  const totCrSemNome = lista.filter((p) => !p.nome && p.tipo === "crianca").length;
  for (const p of lista) {
    if (p.nome) continue;
    if (p.tipo === "crianca") {
      ic++;
      p.nome = totCrSemNome > 1 ? `Criança ${ic} de ${resp}` : `Criança de ${resp}`;
    } else {
      ia++;
      p.nome = totAdSemNome > 1 ? `Acompanhante ${ia} de ${resp}` : `Acompanhante de ${resp}`;
    }
  }

  return { ...base, pessoas: lista.map(({ nome, idade, unidade }) => ({ nome, idade, unidade })) };
}

export async function parseGuestText(text: string): Promise<GuestInput> {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> },
    },
    system: SYSTEM,
    messages: [{ role: "user", content: text.slice(0, 1000) }],
  });

  if (response.stop_reason === "refusal") throw new Error("O modelo recusou o pedido.");
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Resposta vazia do modelo.");
  return completarPessoas(JSON.parse(block.text) as Resposta);
}
