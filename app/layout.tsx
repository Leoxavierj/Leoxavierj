import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const titulo = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-titulo", display: "swap" });
const texto = Nunito({ subsets: ["latin"], variable: "--font-texto", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Aniversário de 5 anos do Théo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b24",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
