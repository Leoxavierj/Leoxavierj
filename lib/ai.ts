import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GuestInput } from "./types";

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["responsavel", "status", "pessoas", "observacao"],
  properties: {
    responsavel: { type: "string", description: "Nome do responsável pela família/grupo" },
    status: { type: "string", enum: ["vai", "nao_vai", "aguardando"] },
    pessoas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "idade", "unidade"],
        properties: {
          nome: { type: "string" },
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
- pessoas: só preencha quando houver indicação de quem vai (ou de quem deve ir, se aguardando). Uma entrada por pessoa.
  - A primeira pessoa normalmente é o próprio responsável.
  - Nomes não informados: use "Acompanhante de <responsável>" para adultos e "Criança de <responsável>" para crianças, numerando se houver mais de um (ex.: "Criança 2 de Tia Marta").
  - idade: número inteiro se informado; null se não informado (adultos sem idade ficam null).
  - Para bebês com idade em meses, use unidade "meses"; caso contrário "anos".
  - Se disser apenas "criança" sem idade, use null e mencione na observação que falta a idade.
- Se status for "nao_vai", pessoas deve ser uma lista vazia.
- observacao: qualquer detalhe útil que não caiba nos outros campos (restrições alimentares, horário, etc.). Vazio se nada.`;

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
  return JSON.parse(block.text) as GuestInput;
}
