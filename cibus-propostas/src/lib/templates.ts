import type { AppSettings, Executive, ModuleDef, Proposal, ProposalModule, SlideKey } from './types'

export const uid = () => crypto.randomUUID()
export const todayISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const SLIDES: { key: SlideKey; label: string; short: string }[] = [
  { key: 'cover', label: 'Capa', short: 'Capa' },
  { key: 'scenario', label: 'Cenário atual', short: 'Cenário' },
  { key: 'project', label: 'O projeto', short: 'Projeto' },
  { key: 'investment', label: 'Investimentos', short: 'Investimento' },
  { key: 'roi', label: 'ROI', short: 'ROI' },
  { key: 'cases', label: 'Cases', short: 'Cases' },
  { key: 'closing', label: 'Encerramento', short: 'Encerramento' },
]

export interface TemplateDef {
  id: string
  name: string
  description: string
  build: (ctx: TemplateContext) => Proposal
}

export interface TemplateContext {
  settings: AppSettings
  modules: ModuleDef[]
  executive: Executive | null
}

export function execSnapshot(e: Executive | null): Proposal['meta']['executive'] {
  return {
    name: e?.name ?? '',
    email: e?.email ?? '',
    phone: e?.phone ?? '',
    whatsapp: e?.whatsapp ?? '',
    role: e?.role ?? '',
    photo: e?.photo ?? '',
  }
}

export function moduleRowFromDef(m: ModuleDef, included = false): ProposalModule {
  return {
    id: uid(),
    moduleId: m.id,
    name: m.name,
    description: m.description,
    tablePrice: m.defaultPrice,
    negotiatedPrice: m.defaultPrice,
    included,
  }
}

const defaultTemplate: TemplateDef = {
  id: 'cibus-default',
  name: 'Template padrão Cibus',
  description: 'Capa, cenário atual, projeto, investimentos, ROI, cases e encerramento.',
  build: ({ settings, modules, executive }) => {
    const now = new Date().toISOString()
    const priced = modules.filter((m) => m.active && m.defaultPrice > 0).sort((a, b) => a.sortOrder - b.sortOrder)
    const d = settings.defaults
    return {
      id: uid(),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      templateId: 'cibus-default',
      client: {
        contactName: '',
        company: '',
        cnpj: '',
        state: '',
        city: '',
        stations: 1,
        cnpjs: 1,
        segment: 'Posto de combustível',
        contactRole: '',
        email: '',
        phone: '',
        logo: '',
      },
      meta: {
        title: d.proposalTitle,
        product: 'Cibus Fuel',
        date: todayISO(),
        validity: d.validity,
        executiveId: executive?.id ?? null,
        executive: execSnapshot(executive),
      },
      cover: { title: d.coverTitle, subtitle: d.coverSubtitle, image: '' },
      scenario: {
        title: 'Cenário atual',
        subtitle: 'Entendendo o momento atual do cliente',
        currentOperation: '',
        body: '',
        challenges: [],
        opportunities: [],
      },
      project: {
        title: 'O projeto',
        subtitle: 'Como o Cibus pode transformar essa operação',
        objective: '',
        strategy: '',
        howCibusHelps: '',
        moduleIds: [],
      },
      investment: {
        stations: 1,
        modules: priced.map((m) => moduleRowFromDef(m, false)),
        monthlyDiscount: { type: 'fixed', value: 0 },
        implementationPrice: d.implementationPrice,
        implementationDiscount: { type: 'fixed', value: 0 },
        implementationFree: false,
        customDiscounts: [],
        consumption: [
          { id: uid(), name: 'Cadastro inteligente', price: 0.49, unit: 'cadastro' },
          { id: uid(), name: 'SMS', price: 0.17, unit: 'disparo' },
        ],
        note: d.note,
      },
      roi: {
        title: 'O retorno do Cibus',
        subtitle: 'Veja o potencial de retorno da operação.',
        question: 'Quanto o Cibus pode gerar de retorno para o cliente?',
        indicators: [
          { id: uid(), label: 'Ticket médio', value: '+ até 45%', hint: 'Com recompensas e ofertas' },
          { id: uid(), label: 'Faturamento incremental', value: 'R$ —', hint: 'Receita gerada pela maior recorrência' },
          { id: uid(), label: 'Margem incremental', value: 'R$ —', hint: 'Resultado adicional por mês' },
          { id: uid(), label: 'ROI', value: '—', hint: 'Retorno sobre o investimento mensal' },
        ],
        ctaTitle: 'Calcule o potencial de retorno',
        ctaText: 'Simule com os números reais da operação e veja o retorno projetado do Cibus.',
        url: '',
      },
      cases: {
        title: 'Quem já transforma fidelidade em resultado',
        subtitle: 'Resultados reais de clientes Cibus.',
        caseIds: [],
      },
      closing: { title: d.closingTitle, cta: 'Vamos começar?' },
      sections: { cover: true, scenario: true, project: true, investment: true, roi: true, cases: true, closing: true },
    }
  },
}

export const TEMPLATES: TemplateDef[] = [defaultTemplate]

/** Cópia completa para usar uma proposta existente como ponto de partida. */
export function duplicateProposal(p: Proposal): Proposal {
  const copy: Proposal = structuredClone(p)
  const now = new Date().toISOString()
  const idMap = new Map<string, string>()
  copy.investment.modules = copy.investment.modules.map((m) => {
    const id = uid()
    idMap.set(m.id, id)
    return { ...m, id }
  })
  copy.investment.customDiscounts = copy.investment.customDiscounts.map((d) => ({
    ...d,
    id: uid(),
    moduleRowId: d.moduleRowId ? idMap.get(d.moduleRowId) : undefined,
  }))
  copy.investment.consumption = copy.investment.consumption.map((c) => ({ ...c, id: uid() }))
  copy.roi.indicators = copy.roi.indicators.map((i) => ({ ...i, id: uid() }))
  return {
    ...copy,
    id: uid(),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    meta: { ...copy.meta, date: todayISO() },
  }
}

/** Garante que propostas antigas/incompletas tenham todos os campos. */
export function normalizeProposal(p: Partial<Proposal>, ctx: TemplateContext): Proposal {
  const base = defaultTemplate.build(ctx)
  const merge = <T extends object>(a: T, b: Partial<T> | undefined): T => ({ ...a, ...(b ?? {}) })
  return {
    ...base,
    ...p,
    client: merge(base.client, p.client),
    meta: merge(base.meta, p.meta),
    cover: merge(base.cover, p.cover),
    scenario: merge(base.scenario, p.scenario),
    project: merge(base.project, p.project),
    investment: merge(base.investment, p.investment),
    roi: merge(base.roi, p.roi),
    cases: merge(base.cases, p.cases),
    closing: merge(base.closing, p.closing),
    sections: merge(base.sections, p.sections),
  } as Proposal
}
