import { prisma } from "./db";
import { getSettings } from "./settings";
import { addMinutes, endOfDay, hm, isWorkday, minutesOfDay, startOfDay } from "./time";

const leadSelect = {
  id: true, nome: true, telefone: true, email: true, origem: true, interesse: true,
  score: true, status: true, createdAt: true, slaStartAt: true, foraDoHorario: true,
} as const;

/** Leads aguardando o primeiro contato (o topo de todas as telas). */
export async function slaState(now = new Date()) {
  const cfg = await getSettings();
  const pendentes = await prisma.lead.findMany({
    where: { status: "NOVO", firstContactAt: null },
    select: leadSelect,
    orderBy: { slaStartAt: "asc" },
  });
  const slaMs = cfg.slaMinutos * 60_000;
  const ativos = pendentes
    .filter((l) => l.slaStartAt <= now)
    .map((l) => ({ ...l, deadline: new Date(l.slaStartAt.getTime() + slaMs) }));
  // Primeiro os que ainda estão dentro do SLA (menos tempo restante primeiro), depois os estourados (mais recentes primeiro).
  const dentro = ativos.filter((l) => l.deadline > now);
  const estourados = ativos.filter((l) => l.deadline <= now).sort((a, b) => b.slaStartAt.getTime() - a.slaStartAt.getTime());
  const aguardando = pendentes.filter((l) => l.slaStartAt > now);

  const hoje = startOfDay(now);
  const agendadasHoje = await prisma.meeting.count({
    where: { bookedAt: { gte: hoje, lte: endOfDay(now) }, status: { not: "CANCELADA" } },
  });
  return {
    now,
    slaMinutos: cfg.slaMinutos,
    leads: [...dentro, ...estourados],
    aguardandoExpediente: aguardando,
    progresso: { agendadasHoje, meta: cfg.metaReunioes },
  };
}

export type QueueItem = Awaited<ReturnType<typeof buildQueue>>["confirmacoes"][number];

/** Fila do Modo Plantão (as seções 2 a 4; a seção 1 é o banner de SLA). */
export async function buildQueue(now = new Date()) {
  const cfg = await getSettings();
  const hoje = startOfDay(now);
  const fimHoje = endOfDay(now);
  const tasks = await prisma.task.findMany({
    where: { status: "PENDENTE", dueAt: { lte: fimHoje } },
    include: { lead: { select: leadSelect } },
    orderBy: { dueAt: "asc" },
  });
  const meetingIds = tasks.map((t) => t.meetingId).filter((x): x is number => x != null);
  const meetings = await prisma.meeting.findMany({ where: { id: { in: meetingIds } } });
  const mById = new Map(meetings.map((m) => [m.id, m]));
  const items = tasks.map((t) => ({
    ...t,
    meeting: t.meetingId ? (mById.get(t.meetingId) ?? null) : null,
    disponivel: t.dueAt <= now,
  }));

  const confirmacoes = items.filter((t) => t.tipo === "CONFIRMACAO");
  const followups = items.filter((t) => t.tipo !== "CONFIRMACAO");
  const atrasados = followups.filter((t) => t.dueAt < hoje);
  const doDia = followups
    .filter((t) => t.dueAt >= hoje)
    .sort((a, b) => {
      // Disponíveis agora primeiro; entre eles, mais qualificados e mais recentes primeiro.
      if (a.disponivel !== b.disponivel) return a.disponivel ? -1 : 1;
      if (!a.disponivel) return a.dueAt.getTime() - b.dueAt.getTime();
      if (a.lead.score !== b.lead.score) return b.lead.score - a.lead.score;
      return b.lead.createdAt.getTime() - a.lead.createdAt.getTime();
    });

  // Blocos da estrutura do dia
  const ini = hm(cfg.horaInicio);
  const fim = hm(cfg.horaFim);
  const min = minutesOfDay(now);
  const workday = isWorkday(cfg, now);
  const bloco = !workday ? null : min >= ini && min < ini + 30 ? "ABERTURA" : min >= fim - 30 && min < fim ? "FECHAMENTO" : null;

  const foraDoHorario = await prisma.lead.findMany({
    where: { foraDoHorario: true, createdAt: { gte: addMinutes(hoje, -3 * 24 * 60) }, slaStartAt: { gte: hoje, lte: fimHoje } },
    select: { ...leadSelect, firstContactAt: true },
    orderBy: { createdAt: "asc" },
  });

  const amanhaIni = new Date(fimHoje.getTime() + 1);
  const reunioesAmanha = await prisma.meeting.findMany({
    where: { scheduledAt: { gte: amanhaIni, lt: new Date(amanhaIni.getTime() + 86_400_000 * 4) }, status: { in: ["AGENDADA", "CONFIRMADA"] } },
    include: { lead: { select: { id: true, nome: true } } },
    orderBy: { scheduledAt: "asc" },
  });
  const reunioesHoje = await prisma.meeting.findMany({
    where: { scheduledAt: { gte: hoje, lte: fimHoje }, status: { not: "CANCELADA" } },
    include: { lead: { select: { id: true, nome: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return {
    now,
    bloco,
    horaInicio: cfg.horaInicio,
    horaFim: cfg.horaFim,
    confirmacoes,
    atrasados,
    doDia,
    foraDoHorario,
    reunioesHoje,
    // Só as do próximo dia útil com reunião
    reunioesAmanha: reunioesAmanha.filter((m, _, arr) => startOfDay(m.scheduledAt).getTime() === startOfDay(arr[0].scheduledAt).getTime()),
  };
}
