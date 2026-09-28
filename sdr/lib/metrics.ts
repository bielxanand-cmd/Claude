import { prisma } from "./db";
import { CONVERSA } from "./constants";
import { getSettings } from "./settings";
import { addDays, endOfDay, isWorkday, startOfDay, startOfWeek } from "./time";

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export async function computeMetrics(range: "day" | "week", ref = new Date(), now = new Date()) {
  const cfg = await getSettings();
  const start = range === "day" ? startOfDay(ref) : startOfWeek(ref);
  const end = range === "day" ? endOfDay(ref) : new Date(addDays(start, 7).getTime() - 1);
  const slaSec = cfg.slaMinutos * 60;

  const dias: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) dias.push(d);
  const diasUteis = dias.filter((d) => isWorkday(cfg, d)).length;
  const meta = range === "day" ? cfg.metaReunioes : cfg.metaReunioes * diasUteis;

  // --- Speed-to-lead
  const leads = await prisma.lead.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { createdAt: true, slaStartAt: true, firstContactAt: true, speedToLeadSec: true },
  });
  const contatados = leads.filter((l) => l.speedToLeadSec != null);
  const avgSpeed = contatados.length ? contatados.reduce((s, l) => s + l.speedToLeadSec!, 0) / contatados.length : null;
  // Entram no denominador os já contatados e os que já estouraram o SLA sem contato.
  const avaliaveis = leads.filter((l) => l.firstContactAt || l.slaStartAt.getTime() + slaSec * 1000 < now.getTime());
  const dentroSla = contatados.filter((l) => l.speedToLeadSec! <= slaSec).length;

  // --- Funil de tentativas
  const attempts = await prisma.attempt.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { leadId: true, resultado: true, canal: true },
  });
  const trabalhados = new Set(attempts.map((a) => a.leadId));
  const conversas = new Set(attempts.filter((a) => CONVERSA.includes(a.resultado)).map((a) => a.leadId));
  const agendaram = new Set(attempts.filter((a) => a.resultado === "AGENDOU").map((a) => a.leadId));

  // --- Reuniões
  const booked = await prisma.meeting.findMany({
    where: { bookedAt: { gte: start, lte: end }, status: { not: "CANCELADA" } },
    select: { attemptNumero: true, bookedAt: true },
  });
  const held = await prisma.meeting.findMany({
    where: { scheduledAt: { gte: start, lte: end }, status: { in: ["REALIZADA", "NO_SHOW"] } },
    select: { status: true, scheduledAt: true },
  });
  const noShows = held.filter((m) => m.status === "NO_SHOW").length;

  const porTentativa = new Map<number, number>();
  for (const m of booked) {
    const k = Math.min(m.attemptNumero, 8);
    porTentativa.set(k, (porTentativa.get(k) ?? 0) + 1);
  }
  const maxT = Math.max(4, ...porTentativa.keys());
  const tentativas = Array.from({ length: maxT }, (_, i) => ({
    tentativa: i + 1 === 8 ? "8ª+" : `${i + 1}ª`,
    reunioes: porTentativa.get(i + 1) ?? 0,
  }));

  const serie = dias.map((d) => {
    const e = endOfDay(d);
    const inDay = (x: Date) => x >= d && x <= e;
    return {
      dia: d,
      leads: leads.filter((l) => inDay(l.createdAt)).length,
      agendadas: booked.filter((m) => inDay(m.bookedAt)).length,
      realizadas: held.filter((m) => m.status === "REALIZADA" && inDay(m.scheduledAt)).length,
      noShow: held.filter((m) => m.status === "NO_SHOW" && inDay(m.scheduledAt)).length,
    };
  });

  const taxaContato = ratio(conversas.size, trabalhados.size);
  const taxaAgendamento = ratio(agendaram.size, conversas.size);
  const taxaNoShow = ratio(noShows, held.length);

  // --- Gargalo: a etapa mais distante da meta (valor / meta).
  const etapas = [
    { etapa: "contato", label: "Contato", valor: taxaContato, meta: cfg.metaContato,
      dica: "Varie horários de ligação, use WhatsApp logo após a ligação e aumente o speed-to-lead." },
    { etapa: "agendamento", label: "Agendamento", valor: taxaAgendamento, meta: cfg.metaAgendamento,
      dica: "Revise o script: faça as perguntas de qualificação e feche sempre oferecendo dois horários." },
    { etapa: "comparecimento", label: "Comparecimento", valor: taxaNoShow == null ? null : 1 - taxaNoShow, meta: 1 - cfg.metaNoShow,
      dica: "Agende mais perto (mesmo dia/dia seguinte) e confirme sempre por WhatsApp." },
  ].map((e) => ({ ...e, indice: e.valor == null || e.meta <= 0 ? null : e.valor / e.meta }));
  const avaliadas = etapas.filter((e) => e.indice != null);
  const pior = avaliadas.sort((a, b) => a.indice! - b.indice!)[0] ?? null;

  return {
    range, inicio: start, fim: end, meta, diasUteis,
    reunioesAgendadas: booked.length,
    leadsRecebidos: leads.length,
    speedMedioSec: avgSpeed,
    pctDentroSla: ratio(dentroSla, avaliaveis.length),
    dentroSla, avaliaveisSla: avaliaveis.length,
    trabalhados: trabalhados.size, conversas: conversas.size, agendaram: agendaram.size,
    tentativasTotal: attempts.length,
    taxaContato, taxaAgendamento, taxaNoShow,
    realizadas: held.length - noShows, noShows,
    tentativas, serie,
    etapas,
    gargalo: pior && pior.indice! < 1 ? pior : null,
  };
}

export type Metrics = Awaited<ReturnType<typeof computeMetrics>>;
