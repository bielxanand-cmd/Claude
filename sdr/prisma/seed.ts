/* Dados de exemplo: simula ~1 semana de trabalho usando as mesmas regras da aplicação. */
import { prisma } from "../lib/db";
import { DEFAULT_CADENCE, DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from "../lib/defaults";
import { createLead } from "../lib/leads";
import { registerAttempt } from "../lib/attempts";
import { suggestSlots } from "../lib/scheduling";
import { updateMeeting } from "../lib/meetings";
import { addDays, addMinutes, atMinutes, hm, isWorkday, startOfDay } from "../lib/time";
import type { Canal, Resultado } from "../lib/constants";

// PRNG determinístico para o seed ser reproduzível
let s = 42;
const rnd = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Rafaela", "Samuel", "Tatiane", "Vinícius", "Beatriz", "Caio", "Débora", "Fábio", "Juliana", "Marcelo", "Patrícia", "Renato", "Sabrina", "Thiago"];
const SOBRENOMES = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Costa", "Ferreira", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Martins", "Rocha", "Barbosa"];
const ORIGENS = ["Formulário site", "Instagram Ads", "Google Ads", "Webinar", "Indicação", "LinkedIn"];
const INTERESSES = ["Diagnóstico comercial", "Treinamento de vendas", "Implantação de CRM", "Consultoria de prospecção"];
const DDDS = ["11", "21", "31", "41", "48", "51", "61", "71", "81", "85"];

function fakeLead(nomeFixo?: string) {
  const nome = nomeFixo ?? `${pick(NOMES)} ${pick(SOBRENOMES)}`;
  const slug = nome.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(" ", ".");
  return {
    nome,
    telefone: `(${pick(DDDS)}) 9${int(1000, 9999)}-${int(1000, 9999)}`,
    email: `${slug}${int(1, 99)}@exemplo.com.br`,
    origem: pick(ORIGENS),
    interesse: pick(INTERESSES),
    observacao: rnd() < 0.3 ? pick(["Quer começar ainda este mês.", "Empresa com 20 vendedores.", "Pediu contato à tarde.", "Já usa uma planilha, quer sair dela."]) : null,
  };
}

/** Resultado de uma conversa (quando o lead atende). */
function conversa(): Resultado {
  const r = rnd();
  return r < 0.42 ? "AGENDOU" : r < 0.75 ? "RETORNAR" : "DESQUALIFICADO";
}

async function attempt(leadId: number, at: Date, canal: Canal, resultado: Resultado, taskId?: number) {
  let scheduledAt: Date | null = null;
  let retornoAt: Date | null = null;
  if (resultado === "AGENDOU") {
    const sl = await suggestSlots(at);
    scheduledAt = (rnd() < 0.6 ? sl.horario1 : sl.horario2) ?? sl.horario1;
  }
  if (resultado === "RETORNAR") retornoAt = addMinutes(at, pick([60, 120, 24 * 60]));
  await registerAttempt(
    leadId,
    { canal, resultado, taskId, scheduledAt, retornoAt, score: resultado === "DESQUALIFICADO" ? 0 : int(1, 3) },
    at,
  );
}

async function main() {
  const now = new Date();
  console.log("Limpando banco...");
  await prisma.attempt.deleteMany();
  await prisma.task.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.cadenceStep.deleteMany();
  await prisma.template.deleteMany();
  await prisma.settings.deleteMany();

  const cfg = await prisma.settings.create({ data: DEFAULT_SETTINGS });
  const tpl = new Map<string, number>();
  for (const t of DEFAULT_TEMPLATES) {
    const r = await prisma.template.create({
      data: { chave: t.key, canal: t.canal, nome: t.nome, assunto: t.assunto ?? null, corpo: t.corpo },
    });
    tpl.set(t.key, r.id);
  }
  for (const c of DEFAULT_CADENCE) {
    await prisma.cadenceStep.create({
      data: { ordem: c.ordem, dia: c.dia, canal: c.canal, titulo: c.titulo, templateId: c.template ? tpl.get(c.template) : null },
    });
  }

  // Últimos 7 dias úteis (incluindo hoje)
  const dias: Date[] = [];
  for (let d = startOfDay(now); dias.length < 7; d = addDays(d, -1)) if (isWorkday(cfg, d)) dias.unshift(d);
  const ini = hm(cfg.horaInicio);
  const fim = hm(cfg.horaFim);

  const criados: { id: number; createdAt: Date; slaStartAt: Date }[] = [];
  for (const dia of dias) {
    const hoje = dia.getTime() === startOfDay(now).getTime();
    const n = hoje ? 8 : int(8, 12);
    for (let i = 0; i < n; i++) {
      const fora = rnd() < 0.1;
      const createdAt = fora ? atMinutes(addDays(dia, -1), int(18 * 60, 23 * 60)) : atMinutes(dia, int(ini, fim - 10));
      if (createdAt > addMinutes(now, -8)) continue;
      const l = await createLead({ ...fakeLead(), createdAt }, { now: createdAt });
      criados.push(l);
    }
  }
  criados.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  console.log(`Simulando atendimento de ${criados.length} leads...`);

  const hojeIni = startOfDay(now);
  for (const l of criados) {
    // speed-to-lead: maioria dentro de 5 min, alguns bem atrasados
    const r = rnd();
    const speedMin = r < 0.65 ? rnd() * 4.5 : r < 0.85 ? 5 + rnd() * 10 : 15 + rnd() * 90;
    const first = addMinutes(l.slaStartAt, speedMin);
    if (first > addMinutes(now, -2)) continue; // fica como NOVO
    await attempt(l.id, first, "LIGACAO", rnd() < 0.3 ? conversa() : rnd() < 0.04 ? "NUMERO_INVALIDO" : "NAO_ATENDEU");

    // Executa as tarefas seguintes que já venceram
    for (let guard = 0; guard < 20; guard++) {
      const t = await prisma.task.findFirst({
        where: { leadId: l.id, status: "PENDENTE", tipo: { not: "CONFIRMACAO" } },
        orderBy: { dueAt: "asc" },
      });
      if (!t || t.dueAt > addMinutes(now, -5)) break;
      // Deixa algumas tarefas sem fazer para aparecerem como atrasadas ou do dia
      if (t.dueAt < hojeIni && rnd() < 0.025) break;
      if (t.dueAt >= hojeIni && rnd() < 0.5) break;
      const at = addMinutes(t.dueAt, int(0, 25));
      if (at > now) break;
      let res: Resultado;
      if (t.tipo === "RETORNO") res = rnd() < 0.55 ? "AGENDOU" : rnd() < 0.5 ? "RETORNAR" : "NAO_ATENDEU";
      else if (t.canal === "LIGACAO") res = rnd() < 0.18 ? conversa() : "NAO_ATENDEU";
      else res = rnd() < 0.08 ? conversa() : "ENVIADO";
      await attempt(l.id, at, t.canal as Canal, res, t.id);
    }
  }

  // Reuniões: confirmação, comparecimento e no-show
  const meetings = await prisma.meeting.findMany({ orderBy: { scheduledAt: "asc" } });
  for (const m of meetings) {
    const conf = await prisma.task.findFirst({ where: { meetingId: m.id, status: "PENDENTE" } });
    if (conf && conf.dueAt < addMinutes(now, -10) && rnd() < 0.85) {
      await updateMeeting(m.id, { status: "CONFIRMADA" }, addMinutes(conf.dueAt, 5));
    }
    const fimReuniao = addMinutes(m.scheduledAt, cfg.duracaoReuniao);
    if (fimReuniao < now) {
      await updateMeeting(m.id, { status: rnd() < 0.78 ? "REALIZADA" : "NO_SHOW" }, fimReuniao);
    }
  }

  // Leads "chegando agora" para ver o cronômetro de SLA funcionando
  const agora = [
    { seg: 20, nome: "Letícia Moraes" },
    { seg: 150, nome: "Rodrigo Tavares" },
    { seg: 400, nome: "Camila Nunes" },
  ];
  for (const a of agora) {
    const createdAt = new Date(now.getTime() - a.seg * 1000);
    await createLead({ ...fakeLead(a.nome), origem: "Formulário site", createdAt }, { now: createdAt, forceSla: true });
  }

  const [leads, tasks, reunioes] = await Promise.all([
    prisma.lead.count(),
    prisma.task.count({ where: { status: "PENDENTE" } }),
    prisma.meeting.count(),
  ]);
  console.log(`Pronto: ${leads} leads, ${reunioes} reuniões, ${tasks} tarefas pendentes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
