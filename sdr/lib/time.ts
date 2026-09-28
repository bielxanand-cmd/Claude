// Todas as datas são gravadas em UTC e interpretadas no fuso de São Paulo.
// O Brasil não tem horário de verão desde 2019, então um offset fixo basta
// e funciona igual no servidor e no navegador.
export const TZ_OFFSET_MIN = -180;
const OFF = TZ_OFFSET_MIN * 60_000;
const DAY = 86_400_000;

export const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export type WorkCfg = { horaInicio: string; horaFim: string; diasUteis: string };

export function local(date: Date) {
  const s = new Date(date.getTime() + OFF);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth() + 1,
    d: s.getUTCDate(),
    hh: s.getUTCHours(),
    mm: s.getUTCMinutes(),
    dow: s.getUTCDay(),
  };
}

export function fromLocal(y: number, m: number, d: number, hh = 0, mm = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - OFF);
}

export function startOfDay(date: Date) {
  const p = local(date);
  return fromLocal(p.y, p.m, p.d);
}

export function endOfDay(date: Date) {
  return new Date(startOfDay(date).getTime() + DAY - 1);
}

export function addDays(date: Date, n: number) {
  return new Date(date.getTime() + n * DAY);
}

export function addMinutes(date: Date, n: number) {
  return new Date(date.getTime() + n * 60_000);
}

export function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Segunda-feira 00:00 da semana da data. */
export function startOfWeek(date: Date) {
  const dow = local(date).dow;
  return addDays(startOfDay(date), -((dow + 6) % 7));
}

export function hm(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesOfDay(date: Date) {
  const p = local(date);
  return p.hh * 60 + p.mm;
}

/** A data (dia local de `day`) no minuto `minutes` do dia. */
export function atMinutes(day: Date, minutes: number) {
  const p = local(day);
  return fromLocal(p.y, p.m, p.d, Math.floor(minutes / 60), minutes % 60);
}

function workdays(cfg: WorkCfg) {
  return cfg.diasUteis.split(",").map((s) => Number(s.trim()));
}

export function isWorkday(cfg: WorkCfg, date: Date) {
  return workdays(cfg).includes(local(date).dow);
}

export function isWorkingTime(cfg: WorkCfg, date: Date) {
  const m = minutesOfDay(date);
  return isWorkday(cfg, date) && m >= hm(cfg.horaInicio) && m < hm(cfg.horaFim);
}

/** Se `date` está no expediente, retorna ela mesma; senão a próxima abertura. */
export function nextWorkStart(cfg: WorkCfg, date: Date) {
  if (isWorkingTime(cfg, date)) return date;
  let day = startOfDay(date);
  if (isWorkday(cfg, date) && minutesOfDay(date) < hm(cfg.horaInicio)) {
    return atMinutes(day, hm(cfg.horaInicio));
  }
  for (let i = 0; i < 14; i++) {
    day = addDays(day, 1);
    if (isWorkday(cfg, day)) return atMinutes(day, hm(cfg.horaInicio));
  }
  return date;
}

/** Soma n dias úteis (mantendo o horário). n = 0 retorna a própria data. */
export function addBusinessDays(cfg: WorkCfg, date: Date, n: number) {
  let d = date;
  let left = n;
  let guard = 0;
  while (left > 0 && guard++ < 60) {
    d = addDays(d, 1);
    if (isWorkday(cfg, d)) left--;
  }
  return d;
}

/** Último dia útil anterior ao dia de `date`. */
export function prevBusinessDay(cfg: WorkCfg, date: Date) {
  let d = startOfDay(date);
  for (let i = 0; i < 14; i++) {
    d = addDays(d, -1);
    if (isWorkday(cfg, d)) return d;
  }
  return addDays(startOfDay(date), -1);
}

/** Próximo dia útil depois do dia de `date` (00:00). */
export function nextBusinessDay(cfg: WorkCfg, date: Date) {
  let d = startOfDay(date);
  for (let i = 0; i < 14; i++) {
    d = addDays(d, 1);
    if (isWorkday(cfg, d)) return d;
  }
  return addDays(startOfDay(date), 1);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function fmtTime(date: Date | string) {
  const p = local(new Date(date));
  return `${pad(p.hh)}:${pad(p.mm)}`;
}

export function fmtDate(date: Date | string) {
  const p = local(new Date(date));
  return `${DIAS[p.dow]} ${pad(p.d)}/${pad(p.m)}`;
}

export function fmtDateTime(date: Date | string) {
  return `${fmtDate(date)} ${fmtTime(date)}`;
}

/** "hoje às 14h00", "amanhã (ter) às 10h30", "qua 30/09 às 09h00" */
export function fmtSlot(date: Date | string, now = new Date()) {
  const d = new Date(date);
  const p = local(d);
  const hora = `${pad(p.hh)}h${pad(p.mm)}`;
  if (sameDay(d, now)) return `hoje às ${hora}`;
  if (sameDay(d, addDays(now, 1))) return `amanhã (${DIAS[p.dow]}) às ${hora}`;
  return `${fmtDate(d)} às ${hora}`;
}

/** Valor para <input type="datetime-local"> no fuso local. */
export function toInputValue(date: Date | string) {
  const p = local(new Date(date));
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}`;
}

export function fromInputValue(v: string) {
  const [dPart, tPart = "00:00"] = v.split("T");
  const [y, m, d] = dPart.split("-").map(Number);
  const [hh, mm] = tPart.split(":").map(Number);
  return fromLocal(y, m, d, hh, mm);
}

export function fmtDuration(sec: number | null | undefined) {
  if (sec == null) return "—";
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min ${pad(s % 60)}s`;
  const h = Math.floor(s / 3600);
  return `${h}h ${pad(Math.floor((s % 3600) / 60))}min`;
}
