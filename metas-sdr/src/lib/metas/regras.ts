/**
 * Regras de cálculo de metas. Funções puras (sem banco, sem relógio implícito)
 * para serem fáceis de testar e reaproveitar em qualquer tela.
 */
import {
  type Dia,
  type Mes,
  diaDaSemana,
  diasDoMes,
  primeiroDiaDoMes,
} from "@/lib/datas";

export type TipoMeta = "DIARIA" | "MENSAL";

export interface MetaRegistro {
  tipo: TipoMeta;
  /** Para MENSAL, null = calculada (meta diária x dias úteis). */
  valor: number | null;
  /** "aaaa-mm-dd" a partir do qual a meta vale. */
  vigenteDesde: Dia;
}

export type CorStatus = "vermelho" | "amarelo" | "verde";

/** Meta vigente de um tipo em uma data: a de maior `vigenteDesde` <= data. */
export function metaVigente(metas: MetaRegistro[], tipo: TipoMeta, dia: Dia): MetaRegistro | null {
  let atual: MetaRegistro | null = null;
  for (const m of metas) {
    if (m.tipo !== tipo || m.vigenteDesde > dia) continue;
    if (!atual || m.vigenteDesde > atual.vigenteDesde) atual = m;
  }
  return atual;
}

/** Valor da meta diária vigente na data (0 se nunca houve meta). */
export function metaDiariaVigente(metas: MetaRegistro[], dia: Dia): number {
  return metaVigente(metas, "DIARIA", dia)?.valor ?? 0;
}

/** Segunda a sexta. */
export function ehDiaUtil(dia: Dia): boolean {
  const s = diaDaSemana(dia);
  return s >= 1 && s <= 5;
}

/** Dia útil que não está marcado como "dia sem meta". */
export function diaTemMeta(dia: Dia, diasSemMeta: ReadonlySet<Dia>): boolean {
  return ehDiaUtil(dia) && !diasSemMeta.has(dia);
}

/** Meta de agendamentos para um dia específico (0 em fins de semana e dias sem meta). */
export function metaDoDia(dia: Dia, metas: MetaRegistro[], diasSemMeta: ReadonlySet<Dia>): number {
  return diaTemMeta(dia, diasSemMeta) ? metaDiariaVigente(metas, dia) : 0;
}

/** Quanto falta para a meta: max(0, meta - realizado). */
export function faltam(meta: number, realizado: number): number {
  return Math.max(0, meta - realizado);
}

/** Percentual atingido (0-100+, sem limite superior). Meta 0 => 100% se houver algo, senão 0. */
export function percentual(realizado: number, meta: number): number {
  if (meta <= 0) return realizado > 0 ? 100 : 0;
  return (realizado / meta) * 100;
}

/** Vermelho < 50%, amarelo 50-99%, verde >= 100%. */
export function corDoPercentual(pct: number): CorStatus {
  if (pct >= 100) return "verde";
  if (pct >= 50) return "amarelo";
  return "vermelho";
}

/** Um dia é "meta atingida" quando tem meta (> 0) e agendamentos >= meta. */
export function metaAtingida(meta: number, agendamentos: number): boolean {
  return meta > 0 && agendamentos >= meta;
}

export interface MetaMensalInfo {
  valor: number;
  origem: "fixa" | "calculada";
}

/**
 * Meta mensal: se houver meta MENSAL fixa vigente no 1º dia do mês, usa ela.
 * Caso contrário, soma a meta diária vigente em cada dia útil (com meta) do mês —
 * o que respeita mudanças de meta diária no meio do mês.
 */
export function metaMensal(mes: Mes, metas: MetaRegistro[], diasSemMeta: ReadonlySet<Dia>): MetaMensalInfo {
  const fixa = metaVigente(metas, "MENSAL", primeiroDiaDoMes(mes));
  if (fixa && fixa.valor != null) return { valor: fixa.valor, origem: "fixa" };
  const valor = diasDoMes(mes).reduce((soma, d) => soma + metaDoDia(d, metas, diasSemMeta), 0);
  return { valor, origem: "calculada" };
}

export type SituacaoDia = "atingida" | "nao-atingida" | "sem-meta" | "em-andamento" | "futuro";

export interface ResultadoDia {
  dia: Dia;
  meta: number;
  agendamentos: number;
  temMeta: boolean;
  atingida: boolean;
  situacao: SituacaoDia;
}

export interface ResumoMes {
  mes: Mes;
  dias: ResultadoDia[];
  agendamentos: number;
  metaMensal: number;
  origemMetaMensal: "fixa" | "calculada";
  faltam: number;
  percentual: number;
  /** Bateu a meta mensal (agendamentos >= meta mensal, com meta > 0). */
  metaMensalAtingida: boolean;
  /** Dias com meta (úteis, fora dos dias sem meta) no mês inteiro. */
  diasComMeta: number;
  /** Dias com meta que já terminaram (antes de hoje). */
  diasComMetaEncerrados: number;
  diasAtingidos: number;
  /** Média de agendamentos por dia com meta já decorrido (inclui hoje se for dia com meta). */
  mediaPorDia: number;
}

/**
 * Consolida um mês. `agendamentosPorDia` já deve excluir agendamentos cancelados.
 * Dias depois de `hojeDia` são "futuro"; o próprio dia de hoje fica "em-andamento"
 * enquanto não atingir a meta (não conta como dia perdido).
 */
export function resumirMes(
  mes: Mes,
  agendamentosPorDia: ReadonlyMap<Dia, number>,
  metas: MetaRegistro[],
  diasSemMeta: ReadonlySet<Dia>,
  hojeDia: Dia,
): ResumoMes {
  const dias: ResultadoDia[] = diasDoMes(mes).map((dia) => {
    const temMeta = diaTemMeta(dia, diasSemMeta);
    const meta = temMeta ? metaDiariaVigente(metas, dia) : 0;
    const agendamentos = agendamentosPorDia.get(dia) ?? 0;
    const atingida = temMeta && metaAtingida(meta, agendamentos);
    let situacao: SituacaoDia;
    if (!temMeta || meta === 0) situacao = "sem-meta";
    else if (atingida) situacao = "atingida";
    else if (dia > hojeDia) situacao = "futuro";
    else if (dia === hojeDia) situacao = "em-andamento";
    else situacao = "nao-atingida";
    return { dia, meta, agendamentos, temMeta: temMeta && meta > 0, atingida, situacao };
  });

  const agendamentos = dias.reduce((s, d) => s + d.agendamentos, 0);
  const mm = metaMensal(mes, metas, diasSemMeta);
  const diasComMeta = dias.filter((d) => d.temMeta).length;
  const diasComMetaEncerrados = dias.filter((d) => d.temMeta && d.dia < hojeDia).length;
  const decorridos = dias.filter((d) => d.temMeta && d.dia <= hojeDia).length;

  return {
    mes,
    dias,
    agendamentos,
    metaMensal: mm.valor,
    origemMetaMensal: mm.origem,
    faltam: faltam(mm.valor, agendamentos),
    percentual: percentual(agendamentos, mm.valor),
    metaMensalAtingida: metaAtingida(mm.valor, agendamentos),
    diasComMeta,
    diasComMetaEncerrados,
    diasAtingidos: dias.filter((d) => d.atingida).length,
    mediaPorDia: decorridos > 0 ? agendamentos / decorridos : 0,
  };
}

/**
 * Sequência (streak) de dias com meta batendo a meta, contando para trás a partir
 * de hoje. Dias sem meta (fins de semana, feriados, folgas) não quebram a sequência.
 * Hoje só entra se já atingiu a meta; se ainda não atingiu, não quebra a sequência.
 * `dias` deve vir em ordem cronológica.
 */
export function sequenciaAtual(dias: ResultadoDia[], hojeDia: Dia): number {
  let n = 0;
  for (let i = dias.length - 1; i >= 0; i--) {
    const d = dias[i];
    if (d.dia > hojeDia || !d.temMeta) continue;
    if (d.atingida) n++;
    else if (d.dia === hojeDia) continue;
    else break;
  }
  return n;
}

/** Maior sequência de dias com meta atingida no período (ordem cronológica). */
export function melhorSequencia(dias: ResultadoDia[]): number {
  let melhor = 0;
  let atual = 0;
  for (const d of dias) {
    if (!d.temMeta) continue;
    if (d.atingida) atual++;
    else if (d.situacao === "nao-atingida") atual = 0;
    melhor = Math.max(melhor, atual);
  }
  return melhor;
}

export interface Jornada {
  /** "HH:mm" */
  inicio: string;
  /** "HH:mm" */
  fim: string;
}

/**
 * Projeção de agendamentos ao fim do dia, mantido o ritmo atual dentro da jornada.
 * Antes da jornada começar, retorna o que já foi feito; depois que ela termina, também.
 */
export function projecaoDoDia(agendamentos: number, minutoAtual: number, jornada: Jornada): number {
  const [hi, mi] = jornada.inicio.split(":").map(Number);
  const [hf, mf] = jornada.fim.split(":").map(Number);
  const inicio = hi * 60 + mi;
  const fim = hf * 60 + mf;
  if (fim <= inicio || minutoAtual <= inicio || minutoAtual >= fim) return agendamentos;
  const fracao = (minutoAtual - inicio) / (fim - inicio);
  return Math.round(agendamentos / fracao);
}

/** Taxa de conversão em % (null se não houver base). */
export function taxaConversao(convertidos: number, base: number): number | null {
  return base > 0 ? (convertidos / base) * 100 : null;
}
