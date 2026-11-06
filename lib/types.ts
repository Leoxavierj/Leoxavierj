// Tipos e funções puras usados tanto no servidor quanto no navegador.

export type Status = "vai" | "nao_vai" | "aguardando";
export type Unidade = "anos" | "meses";
export type Admin = "Leonardo" | "Flávia";

export interface Pessoa {
  nome: string;
  /** null = idade não informada (conta como adulto) */
  idade: number | null;
  unidade: Unidade;
}

export interface Guest {
  id: string;
  responsavel: string;
  status: Status;
  pessoas: Pessoa[];
  observacao: string;
  origem: "formulario" | "manual";
  origemPor?: Admin;
  createdAt: string;
  updatedAt: string;
}

export interface GuestInput {
  responsavel: string;
  status: Status;
  pessoas: Pessoa[];
  observacao: string;
}

export const STATUS_LABEL: Record<Status, string> = {
  vai: "Vai",
  nao_vai: "Não vai",
  aguardando: "Aguardando",
};

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isCrianca(p: Pessoa): boolean {
  if (p.idade === null) return false;
  if (p.unidade === "meses") return true;
  return p.idade < 12;
}

export function formatIdade(p: Pessoa): string {
  if (p.idade === null) return "adulto";
  if (p.unidade === "meses") return p.idade === 1 ? "1 mês" : `${p.idade} meses`;
  return p.idade === 1 ? "1 ano" : `${p.idade} anos`;
}

export function origemLabel(g: Pick<Guest, "origem" | "origemPor">): string {
  return g.origem === "manual" ? `manual (${g.origemPor ?? "?"})` : "formulário";
}

export interface Stats {
  pessoas: number;
  criancas: number;
  adultos: number;
  familiasVai: number;
  familiasNaoVai: number;
  familiasAguardando: number;
}

export function computeStats(guests: Guest[]): Stats {
  const s: Stats = {
    pessoas: 0,
    criancas: 0,
    adultos: 0,
    familiasVai: 0,
    familiasNaoVai: 0,
    familiasAguardando: 0,
  };
  for (const g of guests) {
    if (g.status === "vai") {
      s.familiasVai++;
      for (const p of g.pessoas) {
        s.pessoas++;
        if (isCrianca(p)) s.criancas++;
        else s.adultos++;
      }
    } else if (g.status === "nao_vai") s.familiasNaoVai++;
    else s.familiasAguardando++;
  }
  return s;
}

/** Valida e limpa os dados recebidos. Retorna mensagem de erro ou o input limpo. */
export function sanitizeInput(
  raw: unknown,
  opts: { publico: boolean },
): { ok: true; value: GuestInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Dados inválidos." };
  const r = raw as Record<string, unknown>;

  const responsavel = String(r.responsavel ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!responsavel) return { ok: false, error: "Informe o nome do responsável." };

  const statusOk: Status[] = opts.publico ? ["vai", "nao_vai"] : ["vai", "nao_vai", "aguardando"];
  const status = r.status as Status;
  if (!statusOk.includes(status)) return { ok: false, error: "Escolha uma resposta." };

  const observacao = String(r.observacao ?? "").trim().slice(0, 500);

  const pessoas: Pessoa[] = [];
  if (status !== "nao_vai" && Array.isArray(r.pessoas)) {
    for (const item of r.pessoas.slice(0, 30)) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const nome = String(p.nome ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
      const unidade: Unidade = p.unidade === "meses" ? "meses" : "anos";
      const idadeRaw = p.idade;
      let idade: number | null = null;
      if (idadeRaw !== null && idadeRaw !== undefined && String(idadeRaw).trim() !== "") {
        const n = Number(String(idadeRaw).replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 120) {
          return { ok: false, error: `Idade inválida para ${nome || "uma pessoa"}.` };
        }
        idade = Math.floor(n);
      }
      if (!nome && idade === null) continue; // linha vazia
      if (!nome) return { ok: false, error: "Preencha o nome de todas as pessoas." };
      if (opts.publico && idade === null) {
        return { ok: false, error: `Informe a idade de ${nome}.` };
      }
      pessoas.push({ nome, idade, unidade });
    }
  }

  if (status === "vai" && opts.publico && pessoas.length === 0) {
    return { ok: false, error: "Adicione pelo menos uma pessoa que vai." };
  }

  return { ok: true, value: { responsavel, status, pessoas, observacao } };
}

export function sameContent(a: GuestInput, b: GuestInput): boolean {
  return (
    a.responsavel === b.responsavel &&
    a.status === b.status &&
    a.observacao === b.observacao &&
    JSON.stringify(a.pessoas) === JSON.stringify(b.pessoas)
  );
}
