import { profileOf } from './products'
import { calcInvestment } from './pricing'
import type { Proposal } from './types'
import { textLength } from './utils'

export type StepKey = 'client' | 'scenario' | 'project' | 'investment' | 'roi' | 'cases' | 'review'

export interface CheckItem {
  step: StepKey
  label: string
  ok: boolean
  /** Legado: nenhuma pendência bloqueia mais o PDF; a página pode ser gerada ou retirada */
  blocking: boolean
  message?: string
}

export function validateProposal(p: Proposal): CheckItem[] {
  const calc = calcInvestment(p.investment)
  const s = p.sections
  const items: CheckItem[] = []

  const clientMissing = [
    !p.client.contactName.trim() && 'nome do cliente',
    !p.client.company.trim() && 'empresa',
    !p.meta.date && 'data',
    !p.meta.product && 'produto',
  ].filter(Boolean) as string[]
  items.push({
    step: 'client',
    label: 'Dados do cliente',
    ok: clientMissing.length === 0,
    blocking: false,
    message: clientMissing.length ? `Preencha: ${clientMissing.join(', ')}.` : undefined,
  })

  if (s.scenario) {
    const has = !!(p.scenario.currentOperation.trim() || textLength(p.scenario.body) || p.scenario.challenges.length)
    items.push({
      step: 'scenario',
      label: 'Cenário atual',
      ok: has,
      blocking: false,
      message: has ? undefined : 'Recomendado: descreva o cenário do cliente ou desative a página.',
    })
  }

  if (s.project) {
    const has = [p.project.objective, p.project.strategy, p.project.howCibusHelps].some((h) => textLength(h) > 0)
    items.push({
      step: 'project',
      label: 'Projeto',
      ok: has,
      blocking: false,
      message: has ? undefined : 'Escreva pelo menos uma descrição do projeto.',
    })
  }

  if (s.investment) {
    const missing = [calc.monthly.table <= 0 && `informe a mensalidade ${profileOf(p.meta.product).unit.per}`, calc.includedCount === 0 && 'marque o que está incluso'].filter(Boolean)
    items.push({
      step: 'investment',
      label: 'Investimentos',
      ok: missing.length === 0,
      blocking: false,
      message: missing.length ? `${missing.join(' e ')[0]!.toUpperCase()}${missing.join(' e ').slice(1)}.` : undefined,
    })
  }

  if (s.roi) {
    const ok = p.roi.indicators.some((i) => i.label.trim())
    items.push({ step: 'roi', label: 'ROI', ok, blocking: false, message: ok ? undefined : 'Adicione pelo menos um indicador.' })
  }

  if (s.cases) {
    const ok = p.cases.caseIds.length > 0
    items.push({
      step: 'cases',
      label: 'Cases',
      ok,
      blocking: false,
      message: ok ? undefined : 'Selecione pelo menos um case ou desative a seção de cases.',
    })
  }
  return items
}
