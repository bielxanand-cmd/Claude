import { calcInvestment } from './pricing'
import type { Proposal } from './types'
import { textLength } from './utils'

export type StepKey = 'client' | 'scenario' | 'project' | 'investment' | 'roi' | 'cases' | 'review'

export interface CheckItem {
  step: StepKey
  label: string
  ok: boolean
  /** bloqueia a geração do PDF */
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
    blocking: true,
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
      blocking: true,
      message: has ? undefined : 'Escreva pelo menos uma descrição do projeto.',
    })
  }

  if (s.investment) {
    const ok = calc.includedCount > 0
    items.push({
      step: 'investment',
      label: 'Investimentos',
      ok,
      blocking: true,
      message: ok ? undefined : 'Marque pelo menos um módulo como incluso.',
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
      blocking: true,
      message: ok ? undefined : 'Selecione pelo menos um case ou desative a seção de cases.',
    })
  }
  return items
}
