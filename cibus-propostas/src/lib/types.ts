export type ProposalStatus = 'draft' | 'review' | 'sent' | 'approved' | 'lost'

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: 'Rascunho',
  review: 'Em revisão',
  sent: 'Enviada',
  approved: 'Aprovada',
  lost: 'Perdida',
}

export const SEGMENTS = ['Posto de combustível', 'Rede de postos', 'MATCON', 'Loja', 'Outro'] as const
export const PRODUCTS = ['Cibus Fuel', 'Cibus Partner', 'Cibus Loyalty', 'Outro'] as const

export const MODULE_CATEGORIES = [
  'Fidelidade',
  'Engajamento',
  'Comunicação',
  'Marketing',
  'Inteligência',
  'Operação',
] as const
export type ModuleCategory = (typeof MODULE_CATEGORIES)[number]

export type SlideKey = 'cover' | 'scenario' | 'project' | 'bureau' | 'investment' | 'roi' | 'cases' | 'closing'

export type DiscountType = 'percent' | 'fixed'

export interface Discount {
  type: DiscountType
  value: number
}

export interface Executive {
  id: string
  name: string
  email: string
  phone: string
  whatsapp: string
  role: string
  photo: string
  active: boolean
}

export interface ModuleDef {
  id: string
  name: string
  description: string
  category: ModuleCategory
  /** Legado: a precificação é por posto, não por módulo */
  defaultPrice: number
  active: boolean
  sortOrder: number
}

export interface CaseMetric {
  name: string
  value: string
}

export interface CaseDef {
  id: string
  name: string
  company: string
  segment: string
  location: string
  headline: string
  description: string // HTML
  logo: string
  image: string
  metrics: CaseMetric[] // até 4
  active: boolean
}

/** Item da lista "O que está incluso" da proposta. */
export interface IncludedItem {
  id: string
  moduleId: string | null // null = item personalizado desta proposta
  name: string
  included: boolean
}

export interface ConsumptionItem {
  id: string
  name: string
  price: number
  unit: string // ex.: "cadastro", "disparo"
}

export interface CustomDiscount {
  id: string
  label: string
  type: DiscountType
  value: number
  target: 'implementation' | 'monthly'
}

export interface RoiIndicator {
  id: string
  label: string
  value: string
  hint: string
}

export interface Proposal {
  id: string
  status: ProposalStatus
  createdAt: string
  updatedAt: string
  templateId: string

  client: {
    contactName: string
    company: string
    cnpj: string
    state: string
    city: string
    stations: number
    cnpjs: number
    segment: string
    contactRole: string
    email: string
    phone: string
    logo: string
  }

  meta: {
    title: string
    product: string
    date: string // yyyy-mm-dd
    validity: string
    executiveId: string | null
    executive: Pick<Executive, 'name' | 'email' | 'phone' | 'whatsapp' | 'role' | 'photo'>
  }

  cover: {
    title: string // *trecho* = destaque em laranja
    subtitle: string
    image: string
  }

  scenario: {
    title: string
    subtitle: string
    currentOperation: string
    body: string // HTML
    challenges: string[]
    opportunities: string[]
  }

  project: {
    title: string
    subtitle: string
    objective: string // HTML
    strategy: string // HTML
    howCibusHelps: string // HTML
    moduleIds: string[]
  }

  investment: {
    stations: number
    /** Mensalidade de tabela por posto */
    monthlyPrice: number
    monthlyDiscount: Discount
    /** Implantação: valor do 1º posto + valor de cada posto adicional */
    implementationFirst: number
    implementationAdditional: number
    implementationDiscount: Discount
    implementationFree: boolean
    items: IncludedItem[]
    customDiscounts: CustomDiscount[]
    consumption: ConsumptionItem[]
    note: string
  }

  roi: {
    title: string
    subtitle: string
    question: string
    indicators: RoiIndicator[]
    ctaTitle: string
    ctaText: string
    url: string // vazio = URL das configurações
  }

  cases: {
    title: string
    subtitle: string
    caseIds: string[] // em ordem
  }

  /** Bureau de Marketing Cibus (agência interna) */
  bureau: {
    title: string // *trecho* = destaque na cor da marca
    intro: string // *trecho* = destaque
    columns: { title: string; items: string[] }[]
    note: string
  }

  closing: {
    title: string
    cta: string
  }

  sections: Record<SlideKey, boolean>
}

export interface AppSettings {
  logo: string // logo para fundos claros ('' = logotipo padrão)
  logoDark: string // logo para fundos escuros
  brandColor: string
  inkColor: string
  roiUrl: string
  site: string
  contactEmail: string
  contactPhone: string
  defaults: {
    coverTitle: string
    coverSubtitle: string
    proposalTitle: string
    validity: string
    monthlyPrice: number
    implementationFirst: number
    implementationAdditional: number
    note: string
    closingTitle: string
  }
  /** Identidade e padrões do Cibus Partner (o Fuel usa os campos acima) */
  partner: ProductSettings
}

/** Padrões que variam por produto */
export interface ProductSettings {
  brandColor: string
  inkColor: string
  coverTitle: string
  coverSubtitle: string
  proposalTitle: string
  closingTitle: string
  monthlyPrice: number
  implementationFirst: number
  implementationAdditional: number
}
