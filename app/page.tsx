import type { Metadata } from "next";
import Image from "next/image";
import { EVENT, GOOGLE_CALENDAR_URL, MAPS_URL } from "@/lib/event";
import { siteUrl } from "@/lib/site";
import RsvpForm from "./RsvpForm";
import convite from "@/public/convite.jpg";
import { Controle, Estrelas, IconCalendario, IconPin, IconRelogio } from "./Decor";

const titulo = "Aniversário de 5 anos do Théo";
const descricao = "Confirme sua presença: 20/11, 15h, Game Point";

export function generateMetadata(): Metadata {
  const url = `${siteUrl()}/`;
  const image = { url: `${siteUrl()}/og-image.jpg`, width: 1200, height: 630, type: "image/jpeg", alt: titulo };
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: titulo,
      title: titulo,
      description: descricao,
      url,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, images: [image.url] },
  };
}

export default function Home() {
  return (
    <main className="page">
      <Estrelas />

      <header className="convite">
        <Image
          src={convite}
          alt="Convite do aniversário de 5 anos do Théo"
          priority
          placeholder="blur"
          sizes="(max-width: 560px) 100vw, 560px"
          quality={80}
        />
      </header>

      <section className="card evento" aria-label="Resumo do evento">
        <div className="card-badge"><Controle /> FASE 5</div>
        <h1 className="titulo">Aniversário de 5 anos do Théo</h1>
        <ul className="evento-info">
          <li><IconCalendario /><span><b>{EVENT.dataCurta}</b> · {EVENT.dataLonga.split(",")[0]}</span></li>
          <li><IconRelogio /><span><b>{EVENT.hora}</b></span></li>
          <li><IconPin /><span><b>{EVENT.local}</b></span></li>
        </ul>
        <div className="botoes-evento">
          <a className="btn btn-azul" href="/convite.ics">Adicionar ao calendário</a>
          <a className="btn btn-branco" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
            Como chegar
          </a>
        </div>
        <a className="link-pequeno" href={GOOGLE_CALENDAR_URL} target="_blank" rel="noopener noreferrer">
          Usa Google Agenda? Toque aqui
        </a>
      </section>

      <RsvpForm />

      <footer className="rodape">
        <span className="pixel-seta" aria-hidden="true">▶</span> Te esperamos para jogar!
      </footer>
    </main>
  );
}
