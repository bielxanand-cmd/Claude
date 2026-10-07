import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Fuso usado em toda a aplicação. */
export const FUSO = "America/Sao_Paulo";

/**
 * Datas de calendário são representadas como texto "aaaa-mm-dd" (a "chave do dia").
 * Assim não há ambiguidade de fuso: o dia é sempre o dia em São Paulo.
 */
export type Dia = string;
/** Mês no formato "aaaa-mm". */
export type Mes = string;

const pad = (n: number) => String(n).padStart(2, "0");

/** Dia (em São Paulo) em que um instante cai. */
export function diaDe(instante: Date): Dia {
  const z = new TZDate(instante.getTime(), FUSO);
  return `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`;
}

export function hoje(agora: Date = new Date()): Dia {
  return diaDe(agora);
}

export function mesDe(dia: Dia): Mes {
  return dia.slice(0, 7);
}

export function partesDia(dia: Dia): [number, number, number] {
  const [a, m, d] = dia.split("-").map(Number);
  return [a, m, d];
}

/** Soma (ou subtrai) dias de calendário. */
export function somarDias(dia: Dia, n: number): Dia {
  const [a, m, d] = partesDia(dia);
  const dt = new Date(Date.UTC(a, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = domingo ... 6 = sábado. */
export function diaDaSemana(dia: Dia): number {
  const [a, m, d] = partesDia(dia);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function primeiroDiaDoMes(mes: Mes): Dia {
  return `${mes}-01`;
}

export function ultimoDiaDoMes(mes: Mes): Dia {
  const [a, m] = mes.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m, 0));
  return `${mes}-${pad(dt.getUTCDate())}`;
}

/** Todos os dias de um mês, em ordem. */
export function diasDoMes(mes: Mes): Dia[] {
  const fim = ultimoDiaDoMes(mes);
  const dias: Dia[] = [];
  for (let d = primeiroDiaDoMes(mes); d <= fim; d = somarDias(d, 1)) dias.push(d);
  return dias;
}

export function somarMeses(mes: Mes, n: number): Mes {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** Meses de `inicio` até `fim` (inclusive), em ordem. */
export function mesesEntre(inicio: Mes, fim: Mes): Mes[] {
  const meses: Mes[] = [];
  for (let m = inicio; m <= fim; m = somarMeses(m, 1)) meses.push(m);
  return meses;
}

/** Instante em que começa um dia em São Paulo. */
export function inicioDoDia(dia: Dia): Date {
  const [a, m, d] = partesDia(dia);
  return new Date(new TZDate(a, m - 1, d, 0, 0, 0, FUSO).getTime());
}

/** Intervalo [início, fim) de um dia em São Paulo, em instantes. */
export function intervaloDoDia(dia: Dia): { gte: Date; lt: Date } {
  return { gte: inicioDoDia(dia), lt: inicioDoDia(somarDias(dia, 1)) };
}

/** Intervalo [início, fim) de um mês em São Paulo, em instantes. */
export function intervaloDoMes(mes: Mes): { gte: Date; lt: Date } {
  return { gte: inicioDoDia(primeiroDiaDoMes(mes)), lt: inicioDoDia(primeiroDiaDoMes(somarMeses(mes, 1))) };
}

/** Converte data + hora locais de São Paulo ("aaaa-mm-dd", "HH:mm") num instante. */
export function instanteLocal(dia: Dia, hora: string): Date {
  const [a, m, d] = partesDia(dia);
  const [h, mi] = hora.split(":").map(Number);
  return new Date(new TZDate(a, m - 1, d, h, mi, 0, FUSO).getTime());
}

/** Valor para <input type="datetime-local"> no fuso de São Paulo. */
export function paraInputDataHora(instante: Date): string {
  return format(new TZDate(instante.getTime(), FUSO), "yyyy-MM-dd'T'HH:mm");
}

/** Lê o valor de um <input type="datetime-local"> como horário de São Paulo. */
export function deInputDataHora(valor: string): Date {
  const [dia, hora] = valor.split("T");
  return instanteLocal(dia, hora.slice(0, 5));
}

/** Minutos desde a meia-noite (São Paulo) de um instante. */
export function minutosDoDia(instante: Date): number {
  const z = new TZDate(instante.getTime(), FUSO);
  return z.getHours() * 60 + z.getMinutes();
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

// ---- Formatação pt-BR ----

export function formatarDia(dia: Dia): string {
  const [a, m, d] = partesDia(dia);
  return `${pad(d)}/${pad(m)}/${a}`;
}

export function formatarDataHora(instante: Date): string {
  return format(new TZDate(instante.getTime(), FUSO), "dd/MM/yyyy HH:mm");
}

export function formatarHora(instante: Date): string {
  return format(new TZDate(instante.getTime(), FUSO), "HH:mm");
}

export function formatarMes(mes: Mes, curto = false): string {
  const [a, m] = mes.split("-").map(Number);
  const nome = format(new Date(a, m - 1, 1), curto ? "MMM/yy" : "MMMM 'de' yyyy", { locale: ptBR });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function formatarDiaExtenso(dia: Dia): string {
  const [a, m, d] = partesDia(dia);
  const txt = format(new Date(a, m - 1, d), "EEEE, dd/MM/yyyy", { locale: ptBR });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function ehDiaValido(dia: string): dia is Dia {
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) && somarDias(dia, 0) === dia;
}

export function ehMesValido(mes: string): mes is Mes {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}
