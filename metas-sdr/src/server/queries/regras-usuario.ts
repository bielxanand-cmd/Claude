import "server-only";
import { db } from "@/server/db";
import { type Dia, type Mes, diaDe, mesDe, mesesEntre, intervaloDoDia, intervaloDoMes, hoje } from "@/lib/datas";
import type { MetaRegistro } from "@/lib/metas/regras";

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

type Intervalo = { gte: Date; lt: Date };

/** Agendamentos válidos (não cancelados) por dia, a partir de quando foram feitos. */
export async function agendamentosPorDia(userId: string, intervalo: Intervalo): Promise<Map<Dia, number>> {
  const rows = await db.agendamento.findMany({
    where: { userId, feitoEm: intervalo, status: { not: "CANCELADO" } },
    select: { feitoEm: true },
  });
  const mapa = new Map<Dia, number>();
  for (const r of rows) {
    const d = diaDe(r.feitoEm);
    mapa.set(d, (mapa.get(d) ?? 0) + 1);
  }
  return mapa;
}

/** Contagens do período: leads, ligações, agendamentos válidos e cancelados. */
export async function contagens(userId: string, intervalo: Intervalo) {
  const [leads, ligacoes, ligacoesAtendidas, agendamentos, cancelados] = await Promise.all([
    db.lead.count({ where: { userId, entradaEm: intervalo } }),
    db.ligacao.count({ where: { userId, realizadaEm: intervalo } }),
    db.ligacao.count({ where: { userId, realizadaEm: intervalo, resultado: "ATENDEU" } }),
    db.agendamento.count({ where: { userId, feitoEm: intervalo, status: { not: "CANCELADO" } } }),
    db.agendamento.count({ where: { userId, feitoEm: intervalo, status: "CANCELADO" } }),
  ]);
  return { leads, ligacoes, ligacoesAtendidas, agendamentos, cancelados };
}

export const intervaloHoje = () => intervaloDoDia(hoje());
export { intervaloDoMes };

/** Primeiro mês com algum registro (ou o mês atual, se não houver nada). */
export async function primeiroMesComDados(userId: string): Promise<Mes> {
  const [l, c, a] = await Promise.all([
    db.lead.findFirst({ where: { userId }, orderBy: { entradaEm: "asc" }, select: { entradaEm: true } }),
    db.ligacao.findFirst({ where: { userId }, orderBy: { realizadaEm: "asc" }, select: { realizadaEm: true } }),
    db.agendamento.findFirst({ where: { userId }, orderBy: { feitoEm: "asc" }, select: { feitoEm: true } }),
  ]);
  const datas = [l?.entradaEm, c?.realizadaEm, a?.feitoEm].filter((d): d is Date => !!d);
  if (datas.length === 0) return mesDe(hoje());
  const min = new Date(Math.min(...datas.map((d) => d.getTime())));
  return mesDe(diaDe(min));
}

export function mesesAteHoje(inicio: Mes): Mes[] {
  return mesesEntre(inicio, mesDe(hoje()));
}
