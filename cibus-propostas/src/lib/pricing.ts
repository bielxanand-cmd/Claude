import type { CustomDiscount, Discount, Proposal } from './types'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Valor do desconto (em R$) aplicado sobre `base`, limitado ao próprio valor. */
export function discountAmount(base: number, d: Pick<Discount, 'type' | 'value'>): number {
  if (!d || !Number.isFinite(d.value) || d.value <= 0 || base <= 0) return 0
  const raw = d.type === 'percent' ? (base * Math.min(d.value, 100)) / 100 : d.value
  return round2(Math.min(raw, base))
}

function applyAll(base: number, discounts: Pick<Discount, 'type' | 'value'>[]): number {
  return discounts.reduce((acc, d) => round2(acc - discountAmount(acc, d)), base)
}

export interface InvestmentCalc {
  stations: number
  includedCount: number
  /** Mensalidade por posto */
  monthly: {
    table: number
    final: number
    discount: number // table - final
    discountPercent: number
  }
  /** Mensalidade da rede (por posto × postos) */
  monthlyNetwork: { table: number; final: number; discount: number }
  implementation: {
    first: number
    additional: number
    additionalStations: number
    table: number // 1º posto + adicionais
    final: number
    discount: number
    discountPercent: number
    free: boolean
  }
  summary: {
    table: number // mensal da rede + implantação
    final: number
    savings: number
    savingsPercent: number
    savingsFirstYear: number // 12 meses de mensalidade + implantação
  }
}

const pct = (part: number, whole: number) => (whole > 0 ? round2((part / whole) * 100) : 0)

/** Implantação de tabela: valor do 1º posto + valor de cada posto adicional. */
export function implementationTable(first: number, additional: number, stations: number) {
  const n = Math.max(1, Math.floor(stations || 1))
  return round2(Math.max(0, first || 0) + Math.max(0, additional || 0) * (n - 1))
}

export function calcInvestment(inv: Proposal['investment']): InvestmentCalc {
  const stations = Math.max(1, Math.floor(inv.stations || 1))
  const custom = inv.customDiscounts ?? []
  const byTarget = (t: CustomDiscount['target']) => custom.filter((c) => c.target === t)

  const table = round2(Math.max(0, inv.monthlyPrice || 0))
  const final = Math.max(0, applyAll(table, [inv.monthlyDiscount, ...byTarget('monthly')]))
  const monthlyDiscount = round2(table - final)

  const implTable = implementationTable(inv.implementationFirst, inv.implementationAdditional, stations)
  const implFinal = inv.implementationFree
    ? 0
    : Math.max(0, applyAll(implTable, [inv.implementationDiscount, ...byTarget('implementation')]))
  const implDiscount = round2(implTable - implFinal)

  const netTable = round2(table * stations)
  const netFinal = round2(final * stations)

  const sumTable = round2(netTable + implTable)
  const sumFinal = round2(netFinal + implFinal)
  const savings = round2(sumTable - sumFinal)

  return {
    stations,
    includedCount: (inv.items ?? []).filter((i) => i.included).length,
    monthly: { table, final, discount: monthlyDiscount, discountPercent: pct(monthlyDiscount, table) },
    monthlyNetwork: { table: netTable, final: netFinal, discount: round2(netTable - netFinal) },
    implementation: {
      first: round2(Math.max(0, inv.implementationFirst || 0)),
      additional: round2(Math.max(0, inv.implementationAdditional || 0)),
      additionalStations: stations - 1,
      table: implTable,
      final: implFinal,
      discount: implDiscount,
      discountPercent: pct(implDiscount, implTable),
      free: inv.implementationFree || (implTable > 0 && implFinal === 0),
    },
    summary: {
      table: sumTable,
      final: sumFinal,
      savings,
      savingsPercent: pct(savings, sumTable),
      savingsFirstYear: round2((netTable - netFinal) * 12 + implDiscount),
    },
  }
}

/** Converte um valor final desejado em desconto fixo sobre a base. */
export function discountForFinal(base: number, desiredFinal: number): Discount {
  return { type: 'fixed', value: round2(Math.max(0, base - Math.max(0, desiredFinal))) }
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlInt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** R$ 1.594,00 */
export const formatBRL = (n: number) => brl.format(n || 0).replace(/ /g, ' ')

/** R$ 497 (sem centavos quando inteiro) — usado nos slides */
export const formatBRLShort = (n: number) =>
  (Number.isInteger(round2(n)) ? brlInt.format(n || 0) : brl.format(n || 0)).replace(/ /g, ' ')

/** Preço de consumo: R$ 0,49 */
export const formatUnitPrice = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })
    .format(n || 0)
    .replace(/ /g, ' ')

export const formatPercent = (n: number) =>
  `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n || 0)}%`
