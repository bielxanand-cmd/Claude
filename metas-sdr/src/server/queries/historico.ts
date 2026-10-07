import "server-only";
import { type Dia, type Mes, hoje, mesDe, primeiroDiaDoMes, ultimoDiaDoMes } from "@/lib/datas";
import { type TotaisDia, melhorSequencia, resumirMes, sequenciaAtual, somarTotais, taxaConversao } from "@/lib/metas/regras";
import { agendamentosPorDia, carregarRegras, mesesAteHoje, primeiroMesComDados, totaisPorDia } from "./regras-usuario";

export async function dadosHistorico(userId: string) {
  const diaHoje = hoje();
  const inicio = await primeiroMesComDados(userId);
  const meses = mesesAteHoje(inicio);
  const [regras, totais] = await Promise.all([
    carregarRegras(userId),
    totaisPorDia(userId, primeiroDiaDoMes(inicio), ultimoDiaDoMes(mesDe(diaHoje))),
  ]);
  const porDia = agendamentosPorDia(totais);
  const porMes = new Map<Mes, TotaisDia[]>();
  for (const [dia, t] of totais as Map<Dia, TotaisDia>) {
    const m = mesDe(dia);
    porMes.set(m, [...(porMes.get(m) ?? []), t]);
  }

  const linhas = meses.map((mes) => {
    const r = resumirMes(mes, porDia, regras.metas, regras.diasSemMeta, diaHoje);
    const t = somarTotais(porMes.get(mes) ?? []);
    return {
      mes,
      resumo: r,
      ligacoes: t.ligacoes,
      cancelados: t.cancelados,
      conversao: taxaConversao(r.agendamentos, t.ligacoes),
      emAndamento: mes === mesDe(diaHoje),
    };
  });

  const todosOsDias = linhas.flatMap((l) => l.resumo.dias);
  const melhor = linhas
    .filter((l) => l.resumo.metaMensal > 0)
    .reduce<(typeof linhas)[number] | null>((m, l) => (!m || l.resumo.percentual > m.resumo.percentual ? l : m), null);

  return {
    linhas,
    melhorMes: melhor?.mes ?? null,
    sequenciaAtual: sequenciaAtual(todosOsDias, diaHoje),
    melhorSequencia: melhorSequencia(todosOsDias),
    mesesBatidos: linhas.filter((l) => l.resumo.metaMensalAtingida).length,
    totalDiasBatidos: linhas.reduce((s, l) => s + l.resumo.diasAtingidos, 0),
  };
}
