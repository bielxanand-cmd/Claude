import "server-only";
import { db } from "@/server/db";
import { type Mes, hoje } from "@/lib/datas";
import { corDoPercentual, resumirMes, somarTotais, taxaConversao } from "@/lib/metas/regras";
import { agendamentosPorDia, carregarRegras, totaisDoMes } from "./regras-usuario";

export async function dadosDoMes(userId: string, mes: Mes) {
  const diaHoje = hoje();
  const [regras, totais, diasSemMeta] = await Promise.all([
    carregarRegras(userId),
    totaisDoMes(userId, mes),
    db.diaSemMeta.findMany({ where: { userId, data: { gte: `${mes}-01`, lte: `${mes}-31` } } }),
  ]);
  const resumo = resumirMes(mes, agendamentosPorDia(totais), regras.metas, regras.diasSemMeta, diaHoje);
  const t = somarTotais([...totais.values()]);
  const diasDecorridos = resumo.dias.filter((d) => d.temMeta && d.dia <= diaHoje).length;

  return {
    resumo,
    cor: corDoPercentual(resumo.percentual),
    totais: t,
    ligacoesPorDiaUtil: diasDecorridos ? t.ligacoes / diasDecorridos : null,
    conversao: taxaConversao(t.agendamentos, t.ligacoes),
    ligacoesPorAgendamento: t.agendamentos ? t.ligacoes / t.agendamentos : null,
    motivosSemMeta: Object.fromEntries(diasSemMeta.map((d) => [d.data, d.descricao || d.motivo])),
    ehMesAtual: mes === diaHoje.slice(0, 7),
  };
}
