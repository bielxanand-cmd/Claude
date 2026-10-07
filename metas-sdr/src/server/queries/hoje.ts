import "server-only";
import { db } from "@/server/db";
import { hoje as hojeDia, intervaloDoDia, intervaloDoMes, mesDe, minutosDoDia } from "@/lib/datas";
import {
  corDoPercentual,
  diaTemMeta,
  faltam,
  metaDiariaVigente,
  percentual,
  projecaoDoDia,
  resumirMes,
} from "@/lib/metas/regras";
import { agendamentosPorDia, carregarRegras, contagens } from "./regras-usuario";

export type ItemLinhaDoTempo =
  | { tipo: "lead"; id: string; em: Date; lead: { id: string; nome: string; empresa: string | null; origem: string; status: string; telefone: string | null; email: string | null; observacoes: string | null } }
  | { tipo: "ligacao"; id: string; em: Date; resultado: string; duracaoSeg: number | null; observacao: string | null; lead: { id: string; nome: string } | null }
  | { tipo: "agendamento"; id: string; em: Date; reuniaoEm: Date; status: string; observacao: string | null; lead: { id: string; nome: string } };

export async function dadosDeHoje(userId: string, agora = new Date()) {
  const dia = hojeDia(agora);
  const intervalo = intervaloDoDia(dia);
  const mes = mesDe(dia);

  const [regras, cont, jornadaDia, leads, ligacoes, agendamentos, porDiaMes, diaSemMeta] = await Promise.all([
    carregarRegras(userId),
    contagens(userId, intervalo),
    db.jornadaDia.findUnique({ where: { userId_data: { userId, data: dia } } }),
    db.lead.findMany({ where: { userId, entradaEm: intervalo } }),
    db.ligacao.findMany({ where: { userId, realizadaEm: intervalo }, include: { lead: { select: { id: true, nome: true } } } }),
    db.agendamento.findMany({ where: { userId, feitoEm: intervalo }, include: { lead: { select: { id: true, nome: true } } } }),
    agendamentosPorDia(userId, intervaloDoMes(mes)),
    db.diaSemMeta.findUnique({ where: { userId_data: { userId, data: dia } } }),
  ]);

  const temMeta = diaTemMeta(dia, regras.diasSemMeta);
  const metaVigente = metaDiariaVigente(regras.metas, dia);
  const meta = temMeta ? metaVigente : 0;
  const pct = percentual(cont.agendamentos, meta);
  const jornada = jornadaDia ? { inicio: jornadaDia.inicio, fim: jornadaDia.fim } : regras.jornadaPadrao;
  const resumoMes = resumirMes(mes, porDiaMes, regras.metas, regras.diasSemMeta, dia);

  const linhaDoTempo: ItemLinhaDoTempo[] = [
    ...leads.map((l): ItemLinhaDoTempo => ({ tipo: "lead", id: l.id, em: l.entradaEm, lead: l })),
    ...ligacoes.map((c): ItemLinhaDoTempo => ({
      tipo: "ligacao", id: c.id, em: c.realizadaEm, resultado: c.resultado, duracaoSeg: c.duracaoSeg, observacao: c.observacao, lead: c.lead,
    })),
    ...agendamentos.map((a): ItemLinhaDoTempo => ({
      tipo: "agendamento", id: a.id, em: a.feitoEm, reuniaoEm: a.reuniaoEm, status: a.status, observacao: a.observacao, lead: a.lead,
    })),
  ].sort((a, b) => b.em.getTime() - a.em.getTime());

  return {
    dia,
    contagens: cont,
    temMeta,
    motivoSemMeta: diaSemMeta ? diaSemMeta.motivo : temMeta ? null : ("FIM_DE_SEMANA" as const),
    meta,
    metaVigente,
    faltam: faltam(meta, cont.agendamentos),
    percentual: pct,
    cor: corDoPercentual(pct),
    jornada,
    jornadaPersonalizada: !!jornadaDia,
    projecao: projecaoDoDia(cont.agendamentos, minutosDoDia(agora), jornada),
    resumoMes,
    linhaDoTempo,
  };
}

/** Leads recentes para o seletor rápido dos formulários. */
export async function leadsParaSelecao(userId: string) {
  return db.lead.findMany({
    where: { userId },
    orderBy: { entradaEm: "desc" },
    take: 300,
    select: { id: true, nome: true, empresa: true, status: true },
  });
}
