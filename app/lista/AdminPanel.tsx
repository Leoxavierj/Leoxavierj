"use client";

import { useMemo, useState } from "react";
import {
  computeStats,
  formatIdade,
  normalizeName,
  origemLabel,
  STATUS_LABEL,
  type Admin,
  type Guest,
  type Status,
} from "@/lib/types";
import GuestEditor from "./GuestEditor";

type Filtro = "todos" | Status;

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.reload();
    throw new Error("Sessão expirada.");
  }
  if (!res.ok) throw new Error(data.error || "Algo deu errado. Tente de novo.");
  return data as T;
}

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminPanel({
  admin,
  initialGuests,
  aiEnabled,
}: {
  admin: Admin;
  initialGuests: Guest[];
  aiEnabled: boolean;
}) {
  const [guests, setGuests] = useState(initialGuests);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [editor, setEditor] = useState<{ guest: Guest | null } | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [aviso, setAviso] = useState("");

  const stats = useMemo(() => computeStats(guests), [guests]);

  const visiveis = useMemo(() => {
    const q = normalizeName(busca);
    return guests
      .filter((g) => filtro === "todos" || g.status === filtro)
      .filter(
        (g) =>
          !q ||
          normalizeName(g.responsavel).includes(q) ||
          g.pessoas.some((p) => normalizeName(p.nome).includes(q)),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [guests, filtro, busca]);

  async function recarregar() {
    setAtualizando(true);
    try {
      const { guests } = await api<{ guests: Guest[] }>("/api/admin/guests");
      setGuests(guests);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Erro ao atualizar.");
    } finally {
      setAtualizando(false);
    }
  }

  async function remover(g: Guest) {
    if (!window.confirm(`Remover "${g.responsavel}" da lista? Isso não pode ser desfeito.`)) return;
    try {
      await api(`/api/admin/guests/${g.id}`, { method: "DELETE" });
      setGuests((gs) => gs.filter((x) => x.id !== g.id));
      setAviso(`"${g.responsavel}" removido.`);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Erro ao remover.");
    }
  }

  async function sair() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    window.location.reload();
  }

  const contagem: Record<Filtro, number> = {
    todos: guests.length,
    vai: stats.familiasVai,
    nao_vai: stats.familiasNaoVai,
    aguardando: stats.familiasAguardando,
  };

  return (
    <main className="page page-admin">
      <div className="barra-topo">
        <button className="btn btn-amarelo btn-topo" onClick={() => setEditor({ guest: null })}>
          + Adicionar convidado
        </button>
        <a className="btn btn-contorno btn-topo" href="/api/admin/export">Exportar CSV</a>
      </div>

      <header className="admin-cabecalho">
        <div>
          <h1 className="titulo">Lista de convidados</h1>
          <p className="dica">Olá, {admin}! · <button className="link-btn" onClick={sair}>Sair</button></p>
        </div>
        <button className="link-btn" onClick={recarregar} disabled={atualizando}>
          {atualizando ? "Atualizando..." : "↻ Atualizar"}
        </button>
      </header>

      <section className="placar" aria-label="Resumo">
        <div className="placar-principal">
          <span className="placar-num">{stats.pessoas}</span>
          <span className="placar-rot">pessoas confirmadas</span>
        </div>
        <div className="placar-item"><span className="placar-num sm">{stats.criancas}</span><span className="placar-rot">crianças</span></div>
        <div className="placar-item"><span className="placar-num sm">{stats.adultos}</span><span className="placar-rot">adultos</span></div>
        <div className="placar-familias">
          <span><b>{stats.familiasVai}</b> {stats.familiasVai === 1 ? "família vai" : "famílias vão"}</span>
          <span><b>{stats.familiasNaoVai}</b> {stats.familiasNaoVai === 1 ? "não vai" : "não vão"}</span>
          <span><b>{stats.familiasAguardando}</b> aguardando</span>
        </div>
      </section>

      {aviso && (
        <p className="aviso" role="status" onClick={() => setAviso("")}>{aviso} <span aria-hidden="true">×</span></p>
      )}

      <div className="filtros">
        <div className="segmentos" role="group" aria-label="Filtrar por resposta">
          {(["todos", "vai", "nao_vai", "aguardando"] as Filtro[]).map((f) => (
            <button
              key={f}
              className={`segmento ${filtro === f ? "ativo" : ""}`}
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
            >
              {f === "todos" ? "Todos" : STATUS_LABEL[f]} <small>{contagem[f]}</small>
            </button>
          ))}
        </div>
        <input
          className="campo"
          type="search"
          placeholder="Buscar por nome"
          aria-label="Buscar por nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <ul className="familias">
        {visiveis.length === 0 && <li className="vazio">Nenhum convidado aqui.</li>}
        {visiveis.map((g) => (
          <li key={g.id} className={`familia st-${g.status}`}>
            <div className="familia-topo">
              <h2 className="familia-nome">{g.responsavel}</h2>
              <span className={`selo selo-${g.status}`}>{STATUS_LABEL[g.status]}</span>
            </div>
            {g.pessoas.length > 0 && (
              <ul className="familia-pessoas">
                {g.pessoas.map((p, i) => (
                  <li key={i}>{p.nome} <em>{formatIdade(p)}</em></li>
                ))}
              </ul>
            )}
            {g.observacao && <p className="familia-obs">“{g.observacao}”</p>}
            <div className="familia-rodape">
              <span className="dica">{origemLabel(g)} · {dataCurta(g.updatedAt)}</span>
              <span className="familia-acoes">
                <button className="link-btn" onClick={() => setEditor({ guest: g })}>Editar</button>
                <button className="link-btn perigo" onClick={() => remover(g)}>Remover</button>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {editor && (
        <GuestEditor
          guest={editor.guest}
          aiEnabled={aiEnabled}
          onClose={() => setEditor(null)}
          onSaved={(g) => {
            setGuests((gs) => [...gs.filter((x) => x.id !== g.id), g]);
            setAviso(editor.guest ? `"${g.responsavel}" atualizado.` : `"${g.responsavel}" adicionado.`);
            setEditor(null);
          }}
        />
      )}
    </main>
  );
}
