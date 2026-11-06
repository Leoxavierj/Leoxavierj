import { EVENT } from "@/lib/event";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,");

export function GET() {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Theo 5 anos//Convite//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:aniversario-theo-5-anos-20261120@convite",
    "DTSTAMP:20261101T000000Z",
    `DTSTART:${EVENT.inicioUtc}`,
    `DTEND:${EVENT.fimUtc}`,
    `SUMMARY:${esc(EVENT.titulo)}`,
    `LOCATION:${esc(`${EVENT.local}, ${EVENT.endereco}`)}`,
    `DESCRIPTION:${esc("Festa de 5 anos do Théo no Game Point!")}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc("Amanhã: aniversário do Théo")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="aniversario-theo.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
