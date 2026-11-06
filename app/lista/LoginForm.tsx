"use client";

import { useState } from "react";

export default function LoginForm() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível entrar.");
      window.location.reload();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Sem conexão.");
      setEnviando(false);
    }
  }

  return (
    <main className="page page-login">
      <section className="card">
        <h1 className="titulo">Lista de convidados</h1>
        <p className="dica">Área restrita aos pais do Théo.</p>
        <form onSubmit={onSubmit}>
          <label className="rotulo" htmlFor="usuario">Usuário</label>
          <input id="usuario" className="campo" autoComplete="username" autoCapitalize="none"
            value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input id="senha" className="campo" type="password" autoComplete="current-password"
            value={senha} onChange={(e) => setSenha(e.target.value)} required />
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn btn-amarelo btn-enviar" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
