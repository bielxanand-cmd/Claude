import "server-only";
import { db } from "@/server/db";
import { hoje as hojeDia, intervaloDoDia, mesDe, minutosDoDia } from "@/lib/datas";
import {
  corDoPercentual,
  diaTemMeta,
  faltam,
  metaDiariaVigente,
  percentual,
  projecaoDoDia,
  resumirMes,
} from "@/lib/metas/regras";
import { agendamentosPorDia, carregarRegras, totaisDoMes } from "./regras-usuario";

export async function dadosDeHoje(userId: string, agora = new Date()) {
  const dia = hojeDia(agora);
  const mes = mesDe(dia);

  const [regras, totaisMes, jornadaDia, diaSemMeta, lancamentos] = await Promise.all([
    carregarRegras(userId),
    totaisDoMes(userId, mes),
    db.jornadaDia.findUnique({ where: { userId_data: { userId, data: dia } } }),
    db.diaSemMeta.findUnique({ where: { userId_data: { userId, data: dia } } }),
    // Lançado hoje (inclui cancelamentos que descontam de dias anteriores).
    db.registro.findMany({ where: { userId, em: intervaloDoDia(dia) }, orderBy: { em: "desc" } }),
  ]);

  const totais = totaisMes.get(dia) ?? { ligacoes: 0, feitos: 0, cancelados: 0, agendamentos: 0 };
  const temMeta = diaTemMeta(dia, regras.diasSemMeta);
  const metaVigente = metaDiariaVigente(regras.metas, dia);
  const meta = temMeta ? metaVigente : 0;
  const pct = percentual(totais.agendamentos, meta);
  const jornada = jornadaDia ? { inicio: jornadaDia.inicio, fim: jornadaDia.fim } : regras.jornadaPadrao;

  return {
    dia,
    totais,
    temMeta,
    motivoSemMeta: diaSemMeta ? diaSemMeta.motivo : temMeta ? null : ("FIM_DE_SEMANA" as const),
    meta,
    metaVigente,
    faltam: faltam(meta, totais.agendamentos),
    percentual: pct,
    cor: corDoPercentual(pct),
    jornada,
    jornadaPersonalizada: !!jornadaDia,
    projecao: projecaoDoDia(totais.agendamentos, minutosDoDia(agora), jornada),
    resumoMes: resumirMes(mes, agendamentosPorDia(totaisMes), regras.metas, regras.diasSemMeta, dia),
    lancamentos,
  };
}

export type Lancamento = Awaited<ReturnType<typeof dadosDeHoje>>["lancamentos"][number];
