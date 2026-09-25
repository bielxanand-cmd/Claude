import { PRODUCT_PROFILES, productKeyOf, productSettings, type ProductKey } from './products'
import { MODULE_CATEGORIES, type AppSettings, type Executive, type IncludedItem, type ModuleDef, type Proposal, type SlideKey } from './types'

export const uid = () => crypto.randomUUID()
export const todayISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const SLIDES: { key: SlideKey; label: string; short: string }[] = [
  { key: 'cover', label: 'Capa', short: 'Capa' },
  { key: 'scenario', label: 'Cenário atual', short: 'Cenário' },
  { key: 'project', label: 'O projeto', short: 'Projeto' },
  { key: 'bureau', label: 'Bureau de Marketing', short: 'Bureau' },
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
  /** Produto da nova proposta (padrão: Fuel) */
  product?: ProductKey
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

export function itemFromModule(m: ModuleDef, included = false): IncludedItem {
  return { id: uid(), moduleId: m.id, name: m.name, included }
}

/** Itens ativos da biblioteca, na ordem das categorias. */
export function libraryItems(modules: ModuleDef[]): ModuleDef[] {
  return modules
    .filter((m) => m.active)
    .sort((a, b) => MODULE_CATEGORIES.indexOf(a.category) - MODULE_CATEGORIES.indexOf(b.category) || a.sortOrder - b.sortOrder)
}

/** Conteúdo padrão do slide do Bureau de Marketing Cibus. */
export function defaultBureau(): Proposal['bureau'] {
  return {
    title: 'Estratégia para transformar *o aplicativo em recorrência*',
    intro:
      'O *Bureau de Marketing Cibus* é uma consultoria estratégica e criativa especializada na ativação do programa de fidelidade. Com planejamento, comunicação e materiais personalizados, ajudamos sua empresa a utilizar cashback ou pontos de forma mais estratégica, estimulando o cadastro, o uso do aplicativo e o retorno do cliente.',
    columns: [
      {
        title: 'Planejamos',
        items: ['Estratégia personalizada de ativação e recorrência', 'Conceito criativo das campanhas', 'Diretrizes de comunicação online e offline'],
      },
      {
        title: 'Criamos',
        items: ['Kit de conteúdos personalizados para redes sociais', 'Materiais gráficos para utilização no estabelecimento', 'Banners promocionais para o aplicativo'],
      },
      {
        title: 'Orientamos',
        items: ['Abordagem e comunicação da campanha', 'Direcionamento para execução das ações', 'Acompanhamento estratégico durante a campanha'],
      },
    ],
    note: 'A execução é realizada pela equipe ou agência da empresa. Não estão inclusos gestão de anúncios, publicação nas redes sociais, operação diária das campanhas e execução de ações presenciais.',
  }
}

const defaultTemplate: TemplateDef = {
  id: 'cibus-default',
  name: 'Template padrão Cibus',
  description: 'Capa, cenário atual, projeto, investimentos, ROI, cases e encerramento.',
  build: ({ settings, modules, executive, product = 'fuel' }) => {
    const now = new Date().toISOString()
    const d = settings.defaults
    const ps = productSettings(settings, product)
    const profile = PRODUCT_PROFILES[product]
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
        segment: profile.defaultSegment,
        contactRole: '',
        email: '',
        phone: '',
        logo: '',
      },
      meta: {
        title: ps.proposalTitle,
        product: profile.name,
        date: todayISO(),
        validity: d.validity,
        executiveId: executive?.id ?? null,
        executive: execSnapshot(executive),
      },
      cover: { title: ps.coverTitle, subtitle: ps.coverSubtitle, image: '' },
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
        monthlyPrice: ps.monthlyPrice,
        monthlyDiscount: { type: 'fixed', value: 0 },
        implementationFirst: ps.implementationFirst,
        implementationAdditional: ps.implementationAdditional,
        items: libraryItems(modules).map((m) => itemFromModule(m, false)),
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
      bureau: defaultBureau(),
      closing: { title: ps.closingTitle, cta: 'Vamos começar?' },
      sections: { cover: true, scenario: true, project: true, bureau: true, investment: true, roi: true, cases: true, closing: true },
    }
  },
}

export const TEMPLATES: TemplateDef[] = [defaultTemplate]

/** Cópia completa para usar uma proposta existente como ponto de partida. */
export function duplicateProposal(p: Proposal): Proposal {
  const copy: Proposal = structuredClone(p)
  const now = new Date().toISOString()
  copy.investment.items = copy.investment.items.map((m) => ({ ...m, id: uid() }))
  copy.investment.customDiscounts = copy.investment.customDiscounts.map((d) => ({ ...d, id: uid() }))
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
    investment: merge(base.investment, migrateInvestment(p.investment)),
    roi: merge(base.roi, p.roi),
    cases: merge(base.cases, p.cases),
    bureau: merge(base.bureau, p.bureau),
    closing: merge(base.closing, p.closing),
    sections: merge(base.sections, p.sections),
  } as Proposal
}

/**
 * Propostas criadas no modelo antigo (preço por módulo) passam a usar
 * mensalidade por posto e a lista de itens inclusos.
 */
function migrateInvestment(raw: Partial<Proposal['investment']> | undefined): Partial<Proposal['investment']> | undefined {
  if (!raw) return raw
  const { modules, implementationPrice, ...inv } = raw as Partial<Proposal['investment']> & LegacyInvestment
  if (!inv.items && modules) inv.items = modules.map((m) => ({ id: m.id, moduleId: m.moduleId, name: m.name, included: m.included }))
  if (inv.implementationFirst === undefined && typeof implementationPrice === 'number') inv.implementationFirst = implementationPrice
  if (inv.customDiscounts) inv.customDiscounts = inv.customDiscounts.filter((c) => c.target === 'monthly' || c.target === 'implementation')
  return inv
}

interface LegacyInvestment {
  modules?: { id: string; moduleId: string | null; name: string; included: boolean }[]
  implementationPrice?: number
}

/**
 * Ao trocar o produto de uma proposta, troca também os textos e preços que
 * ainda estão no padrão do produto anterior (o que o vendedor editou fica).
 */
export function applyProductDefaults(p: Proposal, product: string, settings: AppSettings): Proposal {
  const from = productSettings(settings, productKeyOf(p.meta.product))
  const toKey = productKeyOf(product)
  const to = productSettings(settings, toKey)
  const fromProfile = PRODUCT_PROFILES[productKeyOf(p.meta.product)]
  const swap = <T,>(cur: T, a: T, b: T) => (cur === a ? b : cur)
  return {
    ...p,
    meta: { ...p.meta, product, title: swap(p.meta.title, from.proposalTitle, to.proposalTitle) },
    client: { ...p.client, segment: swap(p.client.segment, fromProfile.defaultSegment, PRODUCT_PROFILES[toKey].defaultSegment) },
    cover: {
      ...p.cover,
      title: swap(p.cover.title, from.coverTitle, to.coverTitle),
      subtitle: swap(p.cover.subtitle, from.coverSubtitle, to.coverSubtitle),
    },
    closing: { ...p.closing, title: swap(p.closing.title, from.closingTitle, to.closingTitle) },
    investment: {
      ...p.investment,
      monthlyPrice: swap(p.investment.monthlyPrice, from.monthlyPrice, to.monthlyPrice),
      implementationFirst: swap(p.investment.implementationFirst, from.implementationFirst, to.implementationFirst),
      implementationAdditional: swap(p.investment.implementationAdditional, from.implementationAdditional, to.implementationAdditional),
    },
  }
}
