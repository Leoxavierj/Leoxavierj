"use client";

import { useEffect, useRef, useState } from "react";
import { formatIdade, type Pessoa } from "@/lib/types";
import PeopleEditor, { linhasParaPessoas, novaLinha, type Linha } from "./PeopleEditor";

type Resp = "vai" | "nao_vai";

interface Enviado {
  responsavel: string;
  status: Resp;
  pessoas: Pessoa[];
  observacao: string;
  atualizado: boolean;
}

const K_RASCUNHO = "theo5_rascunho";
const K_ENVIADO = "theo5_enviado";

const ls = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  },
  del(k: string) {
    try { localStorage.removeItem(k); } catch {}
  },
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envia com tempo limite e novas tentativas automáticas (conexão ruim). */
async function enviar(payload: unknown): Promise<{ ok: true; data: { isNew: boolean; guest: Enviado } } | { ok: false; error: string }> {
  let ultimaFalha = "Sem conexão. Verifique a internet e toque em enviar de novo.";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa > 0) await espera(1500 * tentativa);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, data };
      if (res.status < 500) return { ok: false, error: data.error || "Confira os dados e tente de novo." };
      ultimaFalha = data.error || "O servidor não respondeu. Tente de novo em instantes.";
    } catch {
      ultimaFalha = "A conexão está lenta ou caiu. Seus dados continuam aqui: toque em enviar de novo.";
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, error: ultimaFalha };
}

export default function RsvpForm() {
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState<Resp | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>(() => [novaLinha()]);
  const [observacao, setObservacao] = useState("");
  const [primeiraVinculada, setPrimeiraVinculada] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState<Enviado | null>(null);
  const [carregado, setCarregado] = useState(false);
  const topoRef = useRef<HTMLElement>(null);

  // Restaura resposta enviada ou rascunho salvo no aparelho
  useEffect(() => {
    const env = ls.get<Enviado>(K_ENVIADO);
    if (env) {
      setEnviado(env);
      preencher(env);
    } else {
      const r = ls.get<{ responsavel: string; status: Resp | null; linhas: Linha[]; observacao: string; vinc: boolean }>(K_RASCUNHO);
      if (r) {
        setResponsavel(r.responsavel || "");
        setStatus(r.status ?? null);
        if (Array.isArray(r.linhas) && r.linhas.length) setLinhas(r.linhas.map((l) => ({ ...novaLinha(), ...l })));
        setObservacao(r.observacao || "");
        setPrimeiraVinculada(r.vinc ?? true);
      }
    }
    setCarregado(true);
  }, []);

  // Salva rascunho a cada alteração
  useEffect(() => {
    if (!carregado || enviado) return;
    ls.set(K_RASCUNHO, { responsavel, status, linhas, observacao, vinc: primeiraVinculada });
  }, [carregado, enviado, responsavel, status, linhas, observacao, primeiraVinculada]);

  function preencher(e: Enviado) {
    setResponsavel(e.responsavel);
    setStatus(e.status);
    setLinhas(
      e.pessoas.length
        ? e.pessoas.map((p) => novaLinha(p.nome, p.idade === null ? "" : String(p.idade), p.unidade))
        : [novaLinha(e.responsavel)],
    );
    setObservacao(e.observacao);
    setPrimeiraVinculada(false);
  }

  function mudarResponsavel(v: string) {
    setResponsavel(v);
    if (primeiraVinculada) setLinhas((ls) => ls.map((l, i) => (i === 0 ? { ...l, nome: v } : l)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const nome = responsavel.trim();
    if (!nome) return setErro("Escreva o seu nome.");
    if (!status) return setErro("Toque em “Vou” ou “Não vou”.");
    const pessoas = status === "vai" ? linhasParaPessoas(linhas) : [];
    if (status === "vai") {
      if (!pessoas.length) return setErro("Adicione pelo menos uma pessoa.");
      const semNome = pessoas.find((p) => !p.nome);
      if (semNome) return setErro("Preencha o nome de todas as pessoas.");
      const semIdade = pessoas.find((p) => p.idade === null);
      if (semIdade) return setErro(`Informe a idade de ${semIdade.nome}.`);
    }
    const website = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("[name=website]")?.value;

    setEnviando(true);
    const r = await enviar({ responsavel: nome, status, pessoas, observacao, website });
    setEnviando(false);
    if (!r.ok) return setErro(r.error);

    const g = r.data.guest ?? { responsavel: nome, status, pessoas, observacao };
    const final: Enviado = { ...g, status: g.status as Resp, atualizado: !r.data.isNew };
    setEnviado(final);
    ls.set(K_ENVIADO, final);
    ls.del(K_RASCUNHO);
    rolarParaTopo();
  }

  function rolarParaTopo() {
    requestAnimationFrame(() => topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (enviado) {
    const vai = enviado.status === "vai";
    return (
      <section className="card obrigado" ref={topoRef} aria-live="polite">
        <div className="obrigado-selo" aria-hidden="true">{vai ? "★" : "♥"}</div>
        <h2 className="titulo">{vai ? "Presença confirmada!" : "Obrigado por avisar!"}</h2>
        <p className="obrigado-texto">
          {vai
            ? `Valeu, ${enviado.responsavel}! O Théo vai adorar jogar com vocês.`
            : `Que pena, ${enviado.responsavel}! Vamos sentir sua falta.`}
          {enviado.atualizado && " Sua resposta foi atualizada."}
        </p>
        <div className="resumo">
          <div className="resumo-linha"><span>Responsável</span><b>{enviado.responsavel}</b></div>
          <div className="resumo-linha"><span>Resposta</span><b>{vai ? "Vou" : "Não vou"}</b></div>
          {vai && (
            <div className="resumo-linha col">
              <span>Quem vai ({enviado.pessoas.length})</span>
              <ul>
                {enviado.pessoas.map((p, i) => (
                  <li key={i}>{p.nome} <em>· {formatIdade(p)}</em></li>
                ))}
              </ul>
            </div>
          )}
          {enviado.observacao && (
            <div className="resumo-linha col"><span>Observação</span><p>{enviado.observacao}</p></div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-contorno"
          onClick={() => {
            ls.del(K_ENVIADO);
            preencher(enviado);
            setEnviado(null);
            rolarParaTopo();
          }}
        >
          Alterar resposta
        </button>
        <p className="dica centro">Para alterar, envie de novo com o mesmo nome.</p>
      </section>
    );
  }

  return (
    <section className="card" ref={topoRef} aria-label="Confirmação de presença">
      <h2 className="titulo titulo-form"><span className="pixel-seta" aria-hidden="true">▶</span> Confirme sua presença</h2>
      <form onSubmit={onSubmit} noValidate>
        <label className="rotulo" htmlFor="responsavel">Seu nome</label>
        <input
          id="responsavel"
          className="campo"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={80}
          placeholder="Nome e sobrenome"
          value={responsavel}
          onChange={(e) => mudarResponsavel(e.target.value)}
        />

        <div className="hp" aria-hidden="true">
          <label>Não preencha<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>

        <fieldset className="escolha">
          <legend className="rotulo">Você vai?</legend>
          <label className={`opcao opcao-vai ${status === "vai" ? "ativa" : ""}`}>
            <input type="radio" name="status" value="vai" checked={status === "vai"} onChange={() => setStatus("vai")} />
            <span>Vou!</span>
          </label>
          <label className={`opcao opcao-nao ${status === "nao_vai" ? "ativa" : ""}`}>
            <input type="radio" name="status" value="nao_vai" checked={status === "nao_vai"} onChange={() => setStatus("nao_vai")} />
            <span>Não vou</span>
          </label>
        </fieldset>

        {status === "vai" && (
          <div className="bloco">
            <p className="rotulo">Quem vai? <small>(inclua você)</small></p>
            <PeopleEditor
              linhas={linhas}
              onChange={setLinhas}
              idadeObrigatoria
              onNomeEditado={(i) => i === 0 && setPrimeiraVinculada(false)}
            />
          </div>
        )}

        <label className="rotulo" htmlFor="obs">Observação <small>(opcional)</small></label>
        <textarea
          id="obs"
          className="campo"
          rows={3}
          maxLength={500}
          placeholder="Alergias, recados para os pais do Théo..."
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button type="submit" className="btn btn-amarelo btn-enviar" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar resposta"}
        </button>
      </form>
    </section>
  );
}
