import { describe, expect, it } from 'vitest'
import { calcInvestment, discountAmount, discountForFinal, formatBRL, formatBRLShort, implementationTable } from './pricing'
import type { Proposal } from './types'

const inv = (patch: Partial<Proposal['investment']> = {}): Proposal['investment'] => ({
  stations: 1,
  monthlyPrice: 540,
  monthlyDiscount: { type: 'fixed', value: 0 },
  implementationFirst: 6000,
  implementationAdditional: 600,
  implementationDiscount: { type: 'fixed', value: 0 },
  implementationFree: false,
  items: [
    { id: 'a', moduleId: 'a', name: 'Cashback', included: true },
    { id: 'b', moduleId: 'b', name: 'Sorteio', included: false },
  ],
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

describe('implantação escalonada', () => {
  it('R$ 6.000 no 1º posto + R$ 600 por posto adicional', () => {
    expect(implementationTable(6000, 600, 1)).toBe(6000)
    expect(implementationTable(6000, 600, 2)).toBe(6600)
    expect(implementationTable(6000, 600, 15)).toBe(14400)
    expect(implementationTable(6000, 600, 0)).toBe(6000)
  })
})

describe('calcInvestment', () => {
  it('mensalidade de R$ 540 por posto', () => {
    const c = calcInvestment(inv({ stations: 15 }))
    expect(c.monthly).toMatchObject({ table: 540, final: 540, discount: 0 })
    expect(c.monthlyNetwork.final).toBe(8100)
    expect(c.implementation).toMatchObject({ table: 14400, final: 14400, additionalStations: 14 })
    expect(c.includedCount).toBe(1)
  })

  it('desconto na mensalidade por posto e valor final digitado', () => {
    const c = calcInvestment(inv({ stations: 10, monthlyDiscount: discountForFinal(540, 497) }))
    expect(c.monthly).toMatchObject({ final: 497, discount: 43 })
    expect(c.monthly.discountPercent).toBeCloseTo((43 / 540) * 100, 2)
    expect(c.monthlyNetwork).toMatchObject({ table: 5400, final: 4970, discount: 430 })
  })

  it('implantação gratuita e com desconto', () => {
    expect(calcInvestment(inv({ stations: 3, implementationFree: true })).implementation).toMatchObject({ table: 7200, final: 0, discount: 7200, free: true })
    expect(calcInvestment(inv({ implementationDiscount: { type: 'percent', value: 50 } })).implementation).toMatchObject({ final: 3000, free: false })
  })

  it('descontos personalizados em cascata', () => {
    const c = calcInvestment(
      inv({
        monthlyPrice: 1000,
        monthlyDiscount: { type: 'percent', value: 10 },
        customDiscounts: [
          { id: '1', label: 'x', type: 'fixed', value: 100, target: 'monthly' },
          { id: '3', label: 'z', type: 'fixed', value: 1000, target: 'implementation' },
        ],
      }),
    )
    expect(c.monthly.final).toBe(800)
    expect(c.implementation.final).toBe(5000)
  })

  it('economia gerada = tabela - final', () => {
    const c = calcInvestment(inv({ stations: 2, monthlyDiscount: { type: 'fixed', value: 40 }, implementationFree: true }))
    expect(c.summary.table).toBe(1080 + 6600)
    expect(c.summary.final).toBe(1000)
    expect(c.summary.savings).toBe(6680)
    expect(c.summary.savingsFirstYear).toBe(80 * 12 + 6600)
  })

  it('nunca fica negativo', () => {
    expect(calcInvestment(inv({ monthlyDiscount: { type: 'fixed', value: 99999 } })).monthly.final).toBe(0)
  })
})

describe('formatação', () => {
  it('BRL', () => {
    expect(formatBRL(1594)).toBe('R$ 1.594,00')
    expect(formatBRLShort(540)).toBe('R$ 540')
    expect(formatBRLShort(497.5)).toBe('R$ 497,50')
  })
})
