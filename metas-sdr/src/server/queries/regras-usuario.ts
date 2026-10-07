import "server-only";
import { db } from "@/server/db";
import { type Dia, type Mes, hoje, mesDe, mesesEntre, primeiroDiaDoMes, ultimoDiaDoMes } from "@/lib/datas";
import { type MetaRegistro, type TotaisDia, totaisDoDia } from "@/lib/metas/regras";

/** Metas, dias sem meta e jornada padrão do usuário — tudo que as regras precisam. */
export async function carregarRegras(userId: string) {
  const [metas, diasSemMeta, config] = await Promise.all([
    db.meta.findMany({ where: { userId }, orderBy: { vigenteDesde: "asc" } }),
    db.diaSemMeta.findMany({ where: { userId }, orderBy: { data: "asc" } }),
    db.config.findUnique({ where: { userId } }),
  ]);
  return {
    metas: metas.map((m): MetaRegistro => ({ tipo: m.tipo, valor: m.valor, vigenteDesde: m.vigenteDesde })),
    diasSemMeta: new Set(diasSemMeta.map((d) => d.data)),
    diasSemMetaLista: diasSemMeta,
    jornadaPadrao: { inicio: config?.jornadaInicio ?? "08:00", fim: config?.jornadaFim ?? "18:00" },
  };
}

/** Totais por dia (ligações, agendamentos feitos, cancelados e válidos) entre duas datas, inclusive. */
export async function totaisPorDia(userId: string, de: Dia, ate: Dia): Promise<Map<Dia, TotaisDia>> {
  const regs = await db.registro.findMany({
    where: { userId, dia: { gte: de, lte: ate } },
    select: { dia: true, tipo: true, quantidade: true },
  });
  const porDia = new Map<Dia, typeof regs>();
  for (const r of regs) {
    const lista = porDia.get(r.dia);
    if (lista) lista.push(r);
    else porDia.set(r.dia, [r]);
  }
  return new Map([...porDia].map(([dia, lista]) => [dia, totaisDoDia(lista)]));
}

export const totaisDoMes = (userId: string, mes: Mes) =>
  totaisPorDia(userId, primeiroDiaDoMes(mes), ultimoDiaDoMes(mes));

/** Agendamentos válidos por dia, no formato que `resumirMes` espera. */
export function agendamentosPorDia(totais: Map<Dia, TotaisDia>): Map<Dia, number> {
  return new Map([...totais].map(([dia, t]) => [dia, t.agendamentos]));
}

/** Primeiro mês com algum lançamento (ou o mês atual, se não houver nada). */
export async function primeiroMesComDados(userId: string): Promise<Mes> {
  const r = await db.registro.findFirst({ where: { userId }, orderBy: { dia: "asc" }, select: { dia: true } });
  return r ? mesDe(r.dia) : mesDe(hoje());
}

export function mesesAteHoje(inicio: Mes): Mes[] {
  return mesesEntre(inicio, mesDe(hoje()));
}
