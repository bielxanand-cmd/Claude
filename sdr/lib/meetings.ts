import type { Settings } from "@prisma/client";
import { prisma, type Tx } from "./db";
import { cancelPending } from "./cadence";
import { confirmationDue } from "./scheduling";
import { getSettings } from "./settings";
import { addMinutes, fmtSlot } from "./time";

async function confirmTemplateId(db: Tx) {
  const t = await db.template.findFirst({ where: { chave: "wa_confirma" } });
  return t?.id ?? null;
}

export async function createConfirmationTask(db: Tx, cfg: Settings, meetingId: number, leadId: number, scheduledAt: Date, now: Date) {
  return db.task.create({
    data: {
      leadId,
      tipo: "CONFIRMACAO",
      canal: "WHATSAPP",
      titulo: `Confirmar reunião (${fmtSlot(scheduledAt, now)})`,
      dueAt: confirmationDue(cfg, scheduledAt, now),
      meetingId,
      templateId: await confirmTemplateId(db),
    },
  });
}

export async function createMeeting(db: Tx, cfg: Settings, leadId: number, scheduledAt: Date, attemptNumero: number, now: Date) {
  const m = await db.meeting.create({ data: { leadId, scheduledAt, attemptNumero, bookedAt: now } });
  await createConfirmationTask(db, cfg, m.id, leadId, scheduledAt, now);
  return m;
}

export type MeetingPatch = { status?: string; scheduledAt?: Date; nota?: string | null };

export async function updateMeeting(id: number, patch: MeetingPatch, now = new Date()) {
  return prisma.$transaction(async (db) => {
    const cfg = await getSettings(db);
    const m = await db.meeting.findUniqueOrThrow({ where: { id } });
    const data: { status?: string; scheduledAt?: Date; nota?: string | null } = {};
    if (patch.nota !== undefined) data.nota = patch.nota;

    const closeConfirmation = (status: "FEITA" | "CANCELADA") =>
      db.task.updateMany({
        where: { meetingId: id, tipo: "CONFIRMACAO", status: "PENDENTE" },
        data: { status, doneAt: status === "FEITA" ? now : null },
      });

    if (patch.scheduledAt && patch.scheduledAt.getTime() !== m.scheduledAt.getTime()) {
      // Reagendamento: nova data e nova tarefa de confirmação.
      data.scheduledAt = patch.scheduledAt;
      data.status = "AGENDADA";
      await closeConfirmation("CANCELADA");
      await cancelPending(db, m.leadId, ["RETORNO"]);
      await db.lead.update({ where: { id: m.leadId }, data: { status: "AGENDADO" } });
      await createConfirmationTask(db, cfg, id, m.leadId, patch.scheduledAt, now);
    }

    if (patch.status && patch.status !== m.status) {
      data.status = patch.status;
      if (patch.status === "CONFIRMADA" || patch.status === "REALIZADA") await closeConfirmation("FEITA");
      if (patch.status === "CANCELADA") await closeConfirmation("CANCELADA");
      if (patch.status === "NO_SHOW") {
        await closeConfirmation("CANCELADA");
        // No-show: volta para "conversando" com uma tarefa para tentar reagendar.
        await db.lead.update({ where: { id: m.leadId }, data: { status: "CONVERSANDO" } });
        await db.task.create({
          data: { leadId: m.leadId, tipo: "RETORNO", canal: "WHATSAPP", titulo: "Reagendar (no-show)", dueAt: addMinutes(now, 10) },
        });
      }
    }
    return db.meeting.update({ where: { id }, data });
  });
}
