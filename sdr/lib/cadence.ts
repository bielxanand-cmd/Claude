import type { CadenceStep, Settings } from "@prisma/client";
import type { Tx } from "./db";
import { addBusinessDays, addMinutes, atMinutes, hm, minutesOfDay, type WorkCfg } from "./time";

/**
 * Calcula quando cada passo vence, a partir do momento da primeira tentativa.
 * - D0: imediato (1 min entre um passo e outro, só para manter a ordem).
 * - Dn: n dias úteis depois, no mesmo horário da primeira tentativa
 *   (limitado ao expediente), para variar o horário de contato.
 */
export function cadenceDueDates(cfg: WorkCfg, steps: Pick<CadenceStep, "dia">[], base: Date) {
  const ini = hm(cfg.horaInicio);
  const fim = hm(cfg.horaFim);
  const mod = Math.min(Math.max(minutesOfDay(base), ini), Math.max(ini, fim - 30));
  const perDay = new Map<number, number>();
  return steps.map((s) => {
    const idx = perDay.get(s.dia) ?? 0;
    perDay.set(s.dia, idx + 1);
    if (s.dia === 0) return addMinutes(base, idx);
    const day = addBusinessDays(cfg, base, s.dia);
    return addMinutes(atMinutes(day, mod), idx);
  });
}

/** Gera as tarefas da cadência (pulando o 1º passo, que é a tentativa que acabou de acontecer). */
export async function generateCadence(db: Tx, cfg: Settings, leadId: number, base: Date) {
  const steps = await db.cadenceStep.findMany({ where: { ativo: true }, orderBy: [{ dia: "asc" }, { ordem: "asc" }] });
  const rest = steps.slice(1);
  const dues = cadenceDueDates(cfg, rest, base);
  for (let i = 0; i < rest.length; i++) {
    const s = rest[i];
    await db.task.create({
      data: {
        leadId,
        tipo: "CADENCIA",
        canal: s.canal,
        titulo: `D${s.dia} · ${s.titulo}`,
        dueAt: dues[i],
        cadenceStepId: s.id,
        templateId: s.templateId,
      },
    });
  }
  return rest.length;
}

export async function cancelPending(db: Tx, leadId: number, tipos?: string[]) {
  const r = await db.task.updateMany({
    where: { leadId, status: "PENDENTE", ...(tipos ? { tipo: { in: tipos } } : {}) },
    data: { status: "CANCELADA" },
  });
  return r.count;
}
