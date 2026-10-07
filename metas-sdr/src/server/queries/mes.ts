import "server-only";
import { db } from "@/server/db";
import { type Mes, hoje, intervaloDoMes } from "@/lib/datas";
import { corDoPercentual, resumirMes, taxaConversao } from "@/lib/metas/regras";
import { agendamentosPorDia, carregarRegras, contagens } from "./regras-usuario";

export async function dadosDoMes(userId: string, mes: Mes) {
  const intervalo = intervaloDoMes(mes);
  const diaHoje = hoje();
  const [regras, porDia, cont, porStatus, diasSemMeta] = await Promise.all([
    carregarRegras(userId),
    agendamentosPorDia(userId, intervalo),
    contagens(userId, intervalo),
    db.agendamento.groupBy({ by: ["status"], where: { userId, feitoEm: intervalo }, _count: true }),
    db.diaSemMeta.findMany({ where: { userId, data: { gte: `${mes}-01`, lte: `${mes}-31` } } }),
  ]);
  const resumo = resumirMes(mes, porDia, regras.metas, regras.diasSemMeta, diaHoje);
  const status = Object.fromEntries(porStatus.map((s) => [s.status, s._count])) as Record<string, number>;

  return {
    resumo,
    cor: corDoPercentual(resumo.percentual),
    contagens: cont,
    status: {
      MARCADO: status.MARCADO ?? 0,
      REALIZADO: status.REALIZADO ?? 0,
      NO_SHOW: status.NO_SHOW ?? 0,
      CANCELADO: status.CANCELADO ?? 0,
    },
    conversao: {
      ligacoesParaAgendamentos: taxaConversao(cont.agendamentos, cont.ligacoes),
      leadsParaAgendamentos: taxaConversao(cont.agendamentos, cont.leads),
    },
    motivosSemMeta: Object.fromEntries(diasSemMeta.map((d) => [d.data, d.descricao || d.motivo])),
    ehMesAtual: mes === diaHoje.slice(0, 7),
  };
}
