import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SEED_MODULES } from '@/data/seed'
import { normalizeProposal } from './templates'
import type { Proposal } from './types'

describe('normalizeProposal', () => {
  it('converte propostas do modelo antigo (preço por módulo)', () => {
    const legacy = {
      id: 'x',
      investment: {
        stations: 3,
        modules: [
          { id: 'r1', moduleId: 'mod-cashback', name: 'Cashback', description: '', tablePrice: 249, negotiatedPrice: 249, included: true },
          { id: 'r2', moduleId: 'mod-sorteio', name: 'Sorteio', description: '', tablePrice: 79.9, negotiatedPrice: 79.9, included: false },
        ],
        implementationPrice: 6000,
        customDiscounts: [{ id: 'd', label: 'x', type: 'fixed', value: 10, target: 'module', moduleRowId: 'r1' }],
      },
    } as unknown as Partial<Proposal>
    const p = normalizeProposal(legacy, { settings: DEFAULT_SETTINGS, modules: SEED_MODULES, executive: null })
    expect(p.investment.items).toEqual([
      { id: 'r1', moduleId: 'mod-cashback', name: 'Cashback', included: true },
      { id: 'r2', moduleId: 'mod-sorteio', name: 'Sorteio', included: false },
    ])
    expect(p.investment.monthlyPrice).toBe(540)
    expect(p.investment.implementationFirst).toBe(6000)
    expect(p.investment.implementationAdditional).toBe(600)
    expect(p.investment.customDiscounts).toEqual([])
    expect('modules' in p.investment).toBe(false)
  })
})
