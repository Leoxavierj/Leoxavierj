// Dados do evento, num lugar só.

export const EVENT = {
  titulo: "Aniversário de 5 anos do Théo",
  dataCurta: "20/11",
  dataLonga: "Sexta-feira, 20 de novembro",
  hora: "15h",
  local: "Américas Shopping - Game Point",
  endereco: "Av. das Américas, 15500 - Recreio dos Bandeirantes, Rio de Janeiro - RJ",
  // 20/11/2026 15:00 em Brasília (UTC-3, sem horário de verão) = 18:00 UTC
  inicioUtc: "20261120T180000Z",
  // Duração estimada de 3 horas para o calendário
  fimUtc: "20261120T210000Z",
} as const;

export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Game Point Américas Shopping, Recreio dos Bandeirantes, Rio de Janeiro");

export const GOOGLE_CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=" + encodeURIComponent(EVENT.titulo) +
  "&dates=" + EVENT.inicioUtc + "/" + EVENT.fimUtc +
  "&location=" + encodeURIComponent(`${EVENT.local}, ${EVENT.endereco}`) +
  "&details=" + encodeURIComponent("Festa de 5 anos do Théo no Game Point!");
