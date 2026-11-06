import type { Metadata } from "next";
import { getSessionAdmin } from "@/lib/auth";
import { listGuests } from "@/lib/guests";
import { aiEnabled } from "@/lib/ai";
import LoginForm from "./LoginForm";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lista de convidados · Théo 5 anos",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default async function ListaPage() {
  const admin = await getSessionAdmin();
  if (!admin) return <LoginForm />;
  const guests = await listGuests();
  return <AdminPanel admin={admin} initialGuests={guests} aiEnabled={aiEnabled()} />;
}
