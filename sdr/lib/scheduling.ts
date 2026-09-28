import type { Settings } from "@prisma/client";
import { prisma, type Tx } from "./db";
import {
  addMinutes, atMinutes, hm, isWorkday, minutesOfDay, nextBusinessDay, prevBusinessDay,
  sameDay, startOfDay, type WorkCfg,
} from "./time";

type Busy = { scheduledAt: Date }[];

function daySlots(cfg: WorkCfg & { duracaoReuniao: number }, day: Date, from: Date, busy: Busy) {
  const out: Date[] = [];
  const dur = cfg.duracaoReuniao;
  const fim = hm(cfg.horaFim);
  let m = hm(cfg.horaInicio);
  if (sameDay(day, from)) {
    // Pelo menos 1h de antecedência, arredondado para a próxima meia hora.
    const min = minutesOfDay(from) + 60;
    m = Math.max(m, Math.ceil(min / 30) * 30);
  }
  for (; m + dur <= fim; m += 30) {
    const s = atMinutes(day, m);
    const e = addMinutes(s, dur);
    const conflict = busy.some((b) => {
      const bs = b.scheduledAt.getTime();
      return bs < e.getTime() && bs + dur * 60_000 > s.getTime();
    });
    if (!conflict) out.push(s);
  }
  return out;
}

/** Sugere horários livres de hoje e do próximo dia útil (prioriza os mais próximos). */
export async function suggestSlots(now = new Date(), db: Tx = prisma, cfgIn?: Settings) {
  const cfg = cfgIn ?? (await db.settings.findUniqueOrThrow({ where: { id: 1 } }));
  const hoje = startOfDay(now);
  const amanha = nextBusinessDay(cfg, now);
  const busy = await db.meeting.findMany({
    where: {
      status: { in: ["AGENDADA", "CONFIRMADA"] },
      scheduledAt: { gte: hoje, lt: new Date(amanha.getTime() + 86_400_000) },
    },
    select: { scheduledAt: true },
  });
  const today = isWorkday(cfg, now) ? daySlots(cfg, hoje, now, busy) : [];
  const next = daySlots(cfg, amanha, now, busy);
  // horario1 = o mais cedo possível; horario2 = o próximo dia útil, ou, se o 1º já é
  // no próximo dia, um horário pelo menos 3h depois (outro período do dia).
  const h1 = today[0] ?? next[0];
  const h2 = today.length && next.length
    ? next[0]
    : (today.length ? today : next).find((d) => h1 && d.getTime() >= h1.getTime() + 3 * 3_600_000) ?? (today[1] ?? next[1]);
  return { hoje: today, amanha: next, horario1: h1 ?? null, horario2: h2 ?? null };
}

/**
 * Tarefa de confirmação: 2h antes se a reunião for no mesmo dia do agendamento;
 * senão no fim do dia útil anterior à reunião (30 min antes de encerrar o expediente).
 */
export function confirmationDue(cfg: WorkCfg, scheduledAt: Date, now: Date) {
  let due: Date;
  if (sameDay(scheduledAt, now)) {
    due = addMinutes(scheduledAt, -120);
  } else {
    const prev = prevBusinessDay(cfg, scheduledAt);
    due = atMinutes(prev, Math.max(hm(cfg.horaInicio), hm(cfg.horaFim) - 30));
  }
  return due < now ? now : due;
}
