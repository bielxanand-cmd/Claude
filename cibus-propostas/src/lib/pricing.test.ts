import { describe, expect, it } from 'vitest'
import { calcInvestment, discountAmount, discountForFinal, formatBRL, formatBRLShort } from './pricing'
import type { Proposal, ProposalModule } from './types'

const row = (id: string, table: number, included = true, negotiated = table): ProposalModule => ({
  id,
  moduleId: id,
  name: id,
  description: '',
  tablePrice: table,
  negotiatedPrice: negotiated,
  included,
})

const inv = (patch: Partial<Proposal['investment']> = {}): Proposal['investment'] => ({
  stations: 1,
  modules: [row('pontos', 249), row('desconto', 249), row('cashback', 249), row('roleta', 249), row('whats', 149.9), row('sorteio', 79.9, false)],
  monthlyDiscount: { type: 'fixed', value: 0 },
  implementationPrice: 6000,
  implementationDiscount: { type: 'fixed', value: 0 },
  implementationFree: false,
  customDiscounts: [],
  consumption: [],
  note: '',
  ...patch,
})

describe('discountAmount', () => {
  it('percentual e fixo, limitado à base', () => {
    expect(discountAmount(1000, { type: 'percent', value: 10 })).toBe(100)
    expect(discountAmount(1000, { type: 'fixed', value: 250 })).toBe(250)
    expect(discountAmount(100, { type: 'fixed', value: 500 })).toBe(100)
    expect(discountAmount(100, { type: 'percent', value: 150 })).toBe(100)
    expect(discountAmount(100, { type: 'percent', value: -5 })).toBe(0)
  })
})

describe('calcInvestment', () => {
  it('exemplo do briefing: R$ 1.594 de tabela → R$ 497 final (desconto de R$ 1.097)', () => {
    const modules = [row('a', 249), row('b', 249), row('c', 249), row('d', 249), row('e', 249), row('f', 149.9), row('g', 79.9), row('h', 79.9), row('i', 39.9, true)]
    // ajusta para somar exatamente 1.594,00
    modules[8] = row('i', 1594 - (249 * 5 + 149.9 + 79.9 + 79.9))
    const c = calcInvestment(inv({ modules, monthlyDiscount: discountForFinal(1594, 497) }))
    expect(c.monthly.table).toBe(1594)
    expect(c.monthly.final).toBe(497)
    expect(c.monthly.discount).toBe(1097)
    expect(c.monthly.discountPercent).toBeCloseTo((1097 / 1594) * 100, 2)
  })

  it('só soma módulos inclusos e respeita valor negociado', () => {
    const c = calcInvestment(inv({ modules: [row('a', 249, true, 200), row('b', 100, false)] }))
    expect(c.monthly.table).toBe(249)
    expect(c.monthly.negotiated).toBe(200)
    expect(c.monthly.final).toBe(200)
    expect(c.monthly.discount).toBe(49)
    expect(c.includedCount).toBe(1)
  })

  it('multiplica pela quantidade de postos', () => {
    const c = calcInvestment(inv({ stations: 10, monthlyDiscount: { type: 'percent', value: 10 } }))
    expect(c.monthly.table).toBe(1145.9)
    expect(c.monthly.final).toBe(1031.31)
    expect(c.monthlyNetwork.final).toBe(10313.1)
    expect(c.monthlyNetwork.table).toBe(11459)
  })

  it('implantação gratuita e com desconto', () => {
    expect(calcInvestment(inv({ implementationFree: true })).implementation).toMatchObject({ final: 0, discount: 6000, free: true })
    expect(calcInvestment(inv({ implementationDiscount: { type: 'percent', value: 50 } })).implementation).toMatchObject({ final: 3000, free: false })
  })

  it('descontos personalizados em cascata', () => {
    const c = calcInvestment(
      inv({
        modules: [row('a', 1000)],
        monthlyDiscount: { type: 'percent', value: 10 },
        customDiscounts: [
          { id: '1', label: 'x', type: 'fixed', value: 100, target: 'monthly' },
          { id: '2', label: 'y', type: 'percent', value: 50, target: 'module', moduleRowId: 'a' },
          { id: '3', label: 'z', type: 'fixed', value: 1000, target: 'implementation' },
        ],
      }),
    )
    // módulo 1000 → 500 (50%), mensal -10% → 450, -100 → 350
    expect(c.monthly.final).toBe(350)
    expect(c.implementation.final).toBe(5000)
  })

  it('economia gerada = tabela - final', () => {
    const c = calcInvestment(inv({ monthlyDiscount: { type: 'fixed', value: 145.9 }, implementationFree: true }))
    expect(c.summary.table).toBe(1145.9 + 6000)
    expect(c.summary.final).toBe(1000)
    expect(c.summary.savings).toBe(6145.9)
    expect(c.summary.savingsFirstYear).toBe(145.9 * 12 + 6000)
  })

  it('nunca fica negativo', () => {
    const c = calcInvestment(inv({ monthlyDiscount: { type: 'fixed', value: 99999 } }))
    expect(c.monthly.final).toBe(0)
  })
})

describe('formatação', () => {
  it('BRL', () => {
    expect(formatBRL(1594)).toBe('R$ 1.594,00')
    expect(formatBRLShort(497)).toBe('R$ 497')
    expect(formatBRLShort(497.5)).toBe('R$ 497,50')
  })
})
