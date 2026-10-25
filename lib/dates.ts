// Datas do painel no horário de Brasília. O servidor (Vercel) roda em UTC, então
// getDate()/getMonth() e `new Date(ano, mes, dia)` erram dia e mês de vendas feitas
// depois das 21h. Tudo que agrupa ou filtra por dia/mês passa por aqui (#6).

export const TIME_ZONE = "America/Sao_Paulo";

export interface ZonedDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

function wallClock(date: Date | string) {
  const parts = partsFormatter.formatToParts(new Date(date));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)!.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** Ano, mês e dia de um instante no horário de Brasília. */
export function zonedParts(date: Date | string): ZonedDate {
  const { year, month, day } = wallClock(date);
  return { year, month, day };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "AAAA-MM" de um instante, no horário de Brasília. */
export function monthKeyOf(date: Date | string): string {
  const { year, month } = zonedParts(date);
  return `${year}-${pad(month)}`;
}

/** "AAAA-MM-DD" de um instante, no horário de Brasília. */
export function dayKeyOf(date: Date | string): string {
  const { year, month, day } = zonedParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Diferença (ms) entre o relógio de Brasília e o UTC no instante dado (−3h hoje). */
function offsetAt(instant: number): number {
  const w = wallClock(new Date(instant));
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(instant / 1000) * 1000;
}

/**
 * Instante da meia-noite de `year-month-day` em Brasília. Aceita mês e dia fora do
 * intervalo, como o construtor de Date (mês 13 = janeiro do ano seguinte, dia 0 =
 * último dia do mês anterior).
 */
export function zonedMidnight(year: number, month: number, day: number): Date {
  const wall = Date.UTC(year, month - 1, day);
  // Segunda passada: o fuso pode mudar entre o palpite e a resposta (horário de verão antigo).
  const first = wall - offsetAt(wall);
  return new Date(wall - offsetAt(first));
}

/** Início do dia de `date` em Brasília. */
export function startOfZonedDay(date: Date | string): Date {
  const { year, month, day } = zonedParts(date);
  return zonedMidnight(year, month, day);
}

/** Início do mês (1–12) em Brasília. */
export function zonedMonthStart(year: number, month: number): Date {
  return zonedMidnight(year, month, 1);
}

/** Dias do mês (1–12); independe de fuso. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Data no formato brasileiro, no horário de Brasília (o servidor renderiza em UTC). */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: TIME_ZONE, ...options });
}

/** Data e hora no formato brasileiro, no horário de Brasília. */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: TIME_ZONE });
}
