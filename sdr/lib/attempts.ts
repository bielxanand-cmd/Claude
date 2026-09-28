import type { Lead } from "@prisma/client";
import { prisma, type Tx } from "./db";
import { cancelPending, generateCadence } from "./cadence";
import { createMeeting } from "./meetings";
import { getSettings } from "./settings";
import { addBusinessDays, endOfDay } from "./time";
import type { Canal, Resultado } from "./constants";

export type AttemptInput = {
  canal: Canal;
  resultado: Resultado;
  nota?: string | null;
  taskId?: number | null;
  scheduledAt?: Date | null; // AGENDOU
  retornoAt?: Date | null; // RETORNAR
  score?: number | null;
};

export class AttemptError extends Error {}

/**
 * Registra uma tentativa de contato e aplica todas as regras:
 * speed-to-lead, conclusão da tarefa, cadência, cancelamentos e agendamento.
 */
export async function registerAttempt(leadId: number, input: AttemptInput, now = new Date()) {
  if (input.resultado === "AGENDOU" && !input.scheduledAt) throw new AttemptError("Informe a data/hora da reunião.");
  if (input.resultado === "RETORNAR" && !input.retornoAt) throw new AttemptError("Informe quando retornar.");

  return prisma.$transaction(async (db) => {
    const cfg = await getSettings(db);
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new AttemptError("Lead não encontrado.");

    const numero = (await db.attempt.count({ where: { leadId } })) + 1;
    const leadData: Partial<Lead> = {};

    if (!lead.firstContactAt) {
      leadData.firstContactAt = now;
      // Medido a partir do início do SLA (inscrição, ou abertura do expediente se chegou fora do horário).
      leadData.speedToLeadSec = Math.max(0, Math.round((now.getTime() - lead.slaStartAt.getTime()) / 1000));
    }
    if (input.score != null) leadData.score = Math.max(0, Math.min(3, input.score));

    // Conclui a tarefa de origem (ou a próxima tarefa vencida do mesmo canal).
    let taskId = input.taskId ?? null;
    if (!taskId) {
      const t = await db.task.findFirst({
        where: { leadId, status: "PENDENTE", canal: input.canal, tipo: { not: "CONFIRMACAO" }, dueAt: { lte: endOfDay(now) } },
        orderBy: { dueAt: "asc" },
      });
      taskId = t?.id ?? null;
    }
    if (taskId) {
      await db.task.updateMany({ where: { id: taskId, leadId, status: "PENDENTE" }, data: { status: "FEITA", doneAt: now } });
    }

    const attempt = await db.attempt.create({
      data: { leadId, canal: input.canal, resultado: input.resultado, nota: input.nota || null, numero, taskId, createdAt: now },
    });

    let meeting = null;
    switch (input.resultado) {
      case "NAO_ATENDEU":
      case "ENVIADO": {
        if (lead.status === "NOVO") {
          leadData.status = "EM_CADENCIA";
          await generateCadence(db, cfg, leadId, now);
        } else {
          const pend = await db.task.count({ where: { leadId, status: "PENDENTE" } });
          if (pend === 0 && lead.status === "EM_CADENCIA") leadData.status = "ENCERRADO";
          if (pend === 0 && lead.status === "CONVERSANDO") {
            await db.task.create({
              data: {
                leadId, tipo: "RETORNO", canal: "LIGACAO", titulo: "Retorno (nova tentativa)",
                dueAt: addBusinessDays(cfg, now, 1),
              },
            });
          }
        }
        break;
      }
      case "AGENDOU": {
        await cancelPending(db, leadId);
        leadData.status = "AGENDADO";
        meeting = await createMeeting(db, cfg, leadId, input.scheduledAt!, numero, now);
        break;
      }
      case "RETORNAR": {
        await cancelPending(db, leadId);
        leadData.status = "CONVERSANDO";
        await db.task.create({
          data: { leadId, tipo: "RETORNO", canal: "LIGACAO", titulo: "Retornar conforme combinado", dueAt: input.retornoAt! },
        });
        break;
      }
      case "DESQUALIFICADO": {
        await cancelPending(db, leadId);
        leadData.status = "DESQUALIFICADO";
        break;
      }
      case "NUMERO_INVALIDO": {
        await cancelPending(db, leadId);
        leadData.status = "INVALIDO";
        break;
      }
    }

    const updated = await db.lead.update({ where: { id: leadId }, data: leadData });
    return { attempt, lead: updated, meeting };
  });
}
