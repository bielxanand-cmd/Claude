import type { AppSettings, ProductSettings } from './types'
import { hexToRgbTriplet } from './utils'

export type ProductKey = 'fuel' | 'partner'

export interface ProductProfile {
  key: ProductKey
  name: string
  description: string
  /** Unidade cobrada: posto (Fuel) ou loja (Partner) */
  unit: {
    one: string
    many: string
    /** "1º posto" / "1ª loja" */
    first: string
    additional: string
    additionalMany: string
    /** "por posto" / "por loja" */
    per: string
  }
  defaultSegment: string
}

export const PRODUCT_PROFILES: Record<ProductKey, ProductProfile> = {
  fuel: {
    key: 'fuel',
    name: 'Cibus Fuel',
    description: 'Fidelidade para postos de combustível e redes.',
    unit: { one: 'posto', many: 'postos', first: '1º posto', additional: 'posto adicional', additionalMany: 'postos adicionais', per: 'por posto' },
    defaultSegment: 'Posto de combustível',
  },
  partner: {
    key: 'partner',
    name: 'Cibus Partner',
    description: 'Fidelidade para quem influencia a compra no balcão das lojas.',
    unit: { one: 'loja', many: 'lojas', first: '1ª loja', additional: 'loja adicional', additionalMany: 'lojas adicionais', per: 'por loja' },
    defaultSegment: 'Loja',
  },
}

export const productKeyOf = (product: string | undefined): ProductKey => (product === 'Cibus Partner' ? 'partner' : 'fuel')

export const profileOf = (product: string | undefined) => PRODUCT_PROFILES[productKeyOf(product)]

/** "10 postos", "1 loja" */
export const unitCount = (n: number, product: string | undefined) => {
  const u = profileOf(product).unit
  return `${n} ${n === 1 ? u.one : u.many}`
}

/** Padrões e identidade do produto, vindos das configurações. */
export function productSettings(settings: AppSettings, key: ProductKey): ProductSettings {
  if (key === 'partner') return settings.partner
  const d = settings.defaults
  return {
    brandColor: settings.brandColor,
    inkColor: settings.inkColor,
    coverTitle: d.coverTitle,
    coverSubtitle: d.coverSubtitle,
    proposalTitle: d.proposalTitle,
    closingTitle: d.closingTitle,
    monthlyPrice: d.monthlyPrice,
    implementationFirst: d.implementationFirst,
    implementationAdditional: d.implementationAdditional,
  }
}

/** Variáveis CSS que tingem os slides com as cores do produto. */
export function productThemeVars(settings: AppSettings, key: ProductKey): Record<string, string> {
  const ps = productSettings(settings, key)
  return {
    '--brand': hexToRgbTriplet(ps.brandColor) ?? '255 92 0',
    '--ink': hexToRgbTriplet(ps.inkColor) ?? '16 24 40',
  }
}
