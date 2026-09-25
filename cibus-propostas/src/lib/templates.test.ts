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

describe('produtos', () => {
  const ctx = { settings: DEFAULT_SETTINGS, modules: SEED_MODULES, executive: null }
  it('nova proposta Partner usa textos e unidade do Partner', async () => {
    const { TEMPLATES } = await import('./templates')
    const p = TEMPLATES[0]!.build({ ...ctx, product: 'partner' })
    expect(p.meta.product).toBe('Cibus Partner')
    expect(p.cover.title).toBe(DEFAULT_SETTINGS.partner.coverTitle)
    expect(p.client.segment).toBe('Loja')
  })
  it('trocar o produto troca o que ainda está no padrão e mantém o que foi editado', async () => {
    const { TEMPLATES, applyProductDefaults } = await import('./templates')
    const fuel = TEMPLATES[0]!.build(ctx)
    const edited = { ...fuel, closing: { ...fuel.closing, title: 'Título do vendedor' } }
    const partner = applyProductDefaults(edited, 'Cibus Partner', DEFAULT_SETTINGS)
    expect(partner.meta.product).toBe('Cibus Partner')
    expect(partner.cover.title).toBe(DEFAULT_SETTINGS.partner.coverTitle)
    expect(partner.meta.title).toBe(DEFAULT_SETTINGS.partner.proposalTitle)
    expect(partner.closing.title).toBe('Título do vendedor')
    const back = applyProductDefaults(partner, 'Cibus Fuel', DEFAULT_SETTINGS)
    expect(back.cover.title).toBe(DEFAULT_SETTINGS.defaults.coverTitle)
  })
})
