"use client";

import type { Unidade } from "@/lib/types";

export interface Linha {
  key: string;
  nome: string;
  idade: string;
  unidade: Unidade;
}

let seq = 0;
export const novaLinha = (nome = "", idade = "", unidade: Unidade = "anos"): Linha => ({
  key: `l${Date.now().toString(36)}${(seq++).toString(36)}`,
  nome,
  idade,
  unidade,
});

export function linhasParaPessoas(linhas: Linha[]) {
  return linhas
    .filter((l) => l.nome.trim() || l.idade.trim())
    .map((l) => ({
      nome: l.nome.trim(),
      idade: l.idade.trim() === "" ? null : Number(l.idade),
      unidade: l.unidade,
    }));
}

export default function PeopleEditor({
  linhas,
  onChange,
  idadeObrigatoria,
  onNomeEditado,
}: {
  linhas: Linha[];
  onChange: (l: Linha[]) => void;
  idadeObrigatoria: boolean;
  onNomeEditado?: (index: number) => void;
}) {
  const update = (i: number, patch: Partial<Linha>) =>
    onChange(linhas.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="pessoas">
      {linhas.map((l, i) => (
        <div className="pessoa" key={l.key}>
          <span className="pessoa-num" aria-hidden="true">{i + 1}</span>
          <input
            className="campo pessoa-nome"
            type="text"
            placeholder="Nome"
            aria-label={`Nome da pessoa ${i + 1}`}
            autoComplete="off"
            autoCapitalize="words"
            maxLength={80}
            value={l.nome}
            onChange={(e) => {
              update(i, { nome: e.target.value });
              onNomeEditado?.(i);
            }}
          />
          <input
            className="campo pessoa-idade"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={idadeObrigatoria ? "Idade" : "Idade"}
            aria-label={`Idade da pessoa ${i + 1}`}
            maxLength={3}
            value={l.idade}
            onChange={(e) => update(i, { idade: e.target.value.replace(/\D/g, "") })}
          />
          <select
            className="campo pessoa-unidade"
            aria-label={`Unidade da idade da pessoa ${i + 1}`}
            value={l.unidade}
            onChange={(e) => update(i, { unidade: e.target.value as Unidade })}
          >
            <option value="anos">anos</option>
            <option value="meses">meses</option>
          </select>
          <button
            type="button"
            className="pessoa-remover"
            aria-label={`Remover pessoa ${i + 1}`}
            disabled={linhas.length <= 1}
            onClick={() => onChange(linhas.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-contorno btn-add"
        onClick={() => onChange([...linhas, novaLinha()])}
      >
        + Adicionar pessoa
      </button>
      {!idadeObrigatoria && <p className="dica">Idade em branco conta como adulto.</p>}
      {idadeObrigatoria && <p className="dica">Para bebês, escolha “meses”.</p>}
    </div>
  );
}
