"use client";

import { useEffect, useState } from "react";
import { STATUS_LABEL, type Guest, type GuestInput, type Status } from "@/lib/types";
import PeopleEditor, { linhasParaPessoas, novaLinha, type Linha } from "../PeopleEditor";
import { api } from "./AdminPanel";

export default function GuestEditor({
  guest,
  aiEnabled,
  onClose,
  onSaved,
}: {
  guest: Guest | null;
  aiEnabled: boolean;
  onClose: () => void;
  onSaved: (g: Guest) => void;
}) {
  const [responsavel, setResponsavel] = useState(guest?.responsavel ?? "");
  const [status, setStatus] = useState<Status>(guest?.status ?? "aguardando");
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    guest?.pessoas.length
      ? guest.pessoas.map((p) => novaLinha(p.nome, p.idade === null ? "" : String(p.idade), p.unidade))
      : [novaLinha(guest?.responsavel ?? "")],
  );
  const [primeiraVinculada, setPrimeiraVinculada] = useState(!guest);
  const [observacao, setObservacao] = useState(guest?.observacao ?? "");
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function aplicar(c: GuestInput) {
    setResponsavel(c.responsavel);
    setStatus(c.status);
    setLinhas(
      c.pessoas.length
        ? c.pessoas.map((p) => novaLinha(p.nome, p.idade === null ? "" : String(p.idade), p.unidade))
        : [novaLinha(c.responsavel)],
    );
    setObservacao(c.observacao);
    setPrimeiraVinculada(false);
  }

  async function preencherComIA() {
    if (!texto.trim()) return;
    setErro("");
    setLendo(true);
    try {
      const { campos } = await api<{ campos: GuestInput }>("/api/admin/parse", {
        method: "POST",
        body: JSON.stringify({ texto }),
      });
      aplicar(campos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao preencher.");
    } finally {
      setLendo(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!responsavel.trim()) return setErro("Informe o nome do responsável.");
    const pessoas = status === "nao_vai" ? [] : linhasParaPessoas(linhas);
    if (pessoas.some((p) => !p.nome)) return setErro("Preencha o nome de todas as pessoas.");
    setSalvando(true);
    try {
      const body = JSON.stringify({ responsavel, status, pessoas, observacao });
      const { guest: g } = guest
        ? await api<{ guest: Guest }>(`/api/admin/guests/${guest.id}`, { method: "PUT", body })
        : await api<{ guest: Guest }>("/api/admin/guests", { method: "POST", body });
      onSaved(g);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      setSalvando(false);
    }
  }

  return (
    <div className="modal-fundo" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-titulo">
        <div className="modal-topo">
          <h2 id="editor-titulo" className="titulo">{guest ? "Editar convidado" : "Adicionar convidado"}</h2>
          <button className="pessoa-remover" aria-label="Fechar" onClick={onClose}>×</button>
        </div>

        {aiEnabled && (
          <div className="ia">
            <label className="rotulo" htmlFor="ia-texto">
              Escrever livremente <small>(opcional)</small>
            </label>
            <textarea
              id="ia-texto"
              className="campo"
              rows={2}
              placeholder="Ex.: Tia Marta, 2 adultos, confirmou"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="button" className="btn btn-azul btn-ia" onClick={preencherComIA} disabled={lendo || !texto.trim()}>
              {lendo ? "Lendo..." : "Preencher campos"}
            </button>
          </div>
        )}

        <form onSubmit={salvar} noValidate>
          <label className="rotulo" htmlFor="ed-resp">Responsável</label>
          <input
            id="ed-resp"
            className="campo"
            autoCapitalize="words"
            maxLength={80}
            value={responsavel}
            onChange={(e) => {
              setResponsavel(e.target.value);
              if (primeiraVinculada) setLinhas((ls) => ls.map((l, i) => (i === 0 ? { ...l, nome: e.target.value } : l)));
            }}
          />

          <fieldset className="escolha escolha-3">
            <legend className="rotulo">Resposta</legend>
            {(["vai", "nao_vai", "aguardando"] as Status[]).map((s) => (
              <label key={s} className={`opcao opcao-${s} ${status === s ? "ativa" : ""}`}>
                <input type="radio" name="ed-status" checked={status === s} onChange={() => setStatus(s)} />
                <span>{STATUS_LABEL[s]}</span>
              </label>
            ))}
          </fieldset>

          {status !== "nao_vai" && (
            <div className="bloco">
              <p className="rotulo">{status === "vai" ? "Pessoas que vão" : "Pessoas previstas"}</p>
              <PeopleEditor
                linhas={linhas}
                onChange={setLinhas}
                idadeObrigatoria={false}
                onNomeEditado={(i) => i === 0 && setPrimeiraVinculada(false)}
              />
            </div>
          )}

          <label className="rotulo" htmlFor="ed-obs">Observação <small>(opcional)</small></label>
          <textarea id="ed-obs" className="campo" rows={2} maxLength={500}
            value={observacao} onChange={(e) => setObservacao(e.target.value)} />

          {erro && <p className="erro" role="alert">{erro}</p>}

          <div className="modal-acoes">
            <button type="button" className="btn btn-contorno" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-amarelo" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
