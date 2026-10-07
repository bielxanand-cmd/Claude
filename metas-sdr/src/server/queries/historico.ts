import "server-only";
import { db } from "@/server/db";
import { type Mes, diaDe, hoje, intervaloDoMes, mesDe, somarMeses } from "@/lib/datas";
import { melhorSequencia, resumirMes, sequenciaAtual, taxaConversao } from "@/lib/metas/regras";
import { carregarRegras, mesesAteHoje, primeiroMesComDados } from "./regras-usuario";

function contarPorMes(datas: Date[]): Map<Mes, number> {
  const m = new Map<Mes, number>();
  for (const d of datas) {
    const k = mesDe(diaDe(d));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export async function dadosHistorico(userId: string) {
  const diaHoje = hoje();
  const inicio = await primeiroMesComDados(userId);
  const meses = mesesAteHoje(inicio);
  const intervalo = { gte: intervaloDoMes(inicio).gte, lt: intervaloDoMes(somarMeses(mesDe(diaHoje), 1)).gte };

  const [regras, agendamentos, leads, ligacoes] = await Promise.all([
    carregarRegras(userId),
    db.agendamento.findMany({ where: { userId, feitoEm: intervalo }, select: { feitoEm: true, status: true } }),
    db.lead.findMany({ where: { userId, entradaEm: intervalo }, select: { entradaEm: true } }),
    db.ligacao.findMany({ where: { userId, realizadaEm: intervalo }, select: { realizadaEm: true } }),
  ]);

  const validos = agendamentos.filter((a) => a.status !== "CANCELADO");
  const porDia = new Map<string, number>();
  for (const a of validos) {
    const d = diaDe(a.feitoEm);
    porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const canceladosPorMes = contarPorMes(agendamentos.filter((a) => a.status === "CANCELADO").map((a) => a.feitoEm));
  const leadsPorMes = contarPorMes(leads.map((l) => l.entradaEm));
  const ligacoesPorMes = contarPorMes(ligacoes.map((l) => l.realizadaEm));

  const linhas = meses.map((mes) => {
    const r = resumirMes(mes, porDia, regras.metas, regras.diasSemMeta, diaHoje);
    const nLeads = leadsPorMes.get(mes) ?? 0;
    const nLig = ligacoesPorMes.get(mes) ?? 0;
    return {
      mes,
      resumo: r,
      leads: nLeads,
      ligacoes: nLig,
      cancelados: canceladosPorMes.get(mes) ?? 0,
      convLigacoes: taxaConversao(r.agendamentos, nLig),
      convLeads: taxaConversao(r.agendamentos, nLeads),
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
