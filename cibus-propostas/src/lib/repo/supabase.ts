import type { SupabaseClient } from '@supabase/supabase-js'
import { prepareImage } from '../image'
import { calcInvestment } from '../pricing'
import { defaultBureau } from '../templates'
import type { AppSettings, CaseDef, CaseMetric, Executive, ModuleDef, Proposal } from '../types'
import type { Repository } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const PROPOSAL_SELECT =
  '*, proposal_scenarios(*), proposal_projects(*), proposal_investments(*), proposal_modules(*), proposal_cases(*)'

const one = (v: Row[] | Row | null | undefined): Row => (Array.isArray(v) ? (v[0] ?? {}) : (v ?? {}))

function rowToProposal(r: Row): Proposal {
  const sc = one(r.proposal_scenarios)
  const pr = one(r.proposal_projects)
  const inv = one(r.proposal_investments)
  const mods = [...(r.proposal_modules ?? [])].sort((a: Row, b: Row) => a.sort_order - b.sort_order)
  const cases = [...(r.proposal_cases ?? [])].sort((a: Row, b: Row) => a.order - b.order)
  return {
    id: r.id,
    status: r.status,
    templateId: r.template_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    client: {
      contactName: r.client_name,
      company: r.company_name,
      cnpj: r.cnpj,
      state: r.state,
      city: r.city,
      stations: r.stations,
      cnpjs: r.cnpjs,
      segment: r.segment,
      contactRole: r.contact_role,
      email: r.contact_email,
      phone: r.contact_phone,
      logo: r.client_logo,
    },
    meta: {
      title: r.title,
      product: r.product,
      date: r.proposal_date ?? '',
      validity: r.valid_until,
      executiveId: r.executive_id,
      executive: r.executive,
    },
    cover: { title: r.cover_title, subtitle: r.cover_subtitle, image: r.cover_image },
    scenario: {
      title: sc.title ?? '',
      subtitle: sc.subtitle ?? '',
      currentOperation: sc.current_operation ?? '',
      body: sc.body ?? '',
      challenges: sc.challenges ?? [],
      opportunities: sc.opportunities ?? [],
    },
    project: {
      title: pr.title ?? '',
      subtitle: pr.subtitle ?? '',
      objective: pr.objective ?? '',
      strategy: pr.strategy ?? '',
      howCibusHelps: pr.description ?? '',
      moduleIds: pr.module_ids ?? [],
    },
    investment: {
      stations: inv.stations ?? 1,
      items: mods.map((m: Row) => ({ id: m.id, moduleId: m.module_id, name: m.name, included: m.included })),
      monthlyPrice: Number(inv.monthly_price ?? 0),
      monthlyDiscount: { type: inv.monthly_discount_type ?? 'fixed', value: Number(inv.monthly_discount_value ?? 0) },
      implementationFirst: Number(inv.implementation_first ?? inv.implementation_price ?? 0),
      implementationAdditional: Number(inv.implementation_additional ?? 0),
      implementationDiscount: {
        type: inv.implementation_discount_type ?? 'fixed',
        value: Number(inv.implementation_discount_value ?? 0),
      },
      implementationFree: inv.implementation_free ?? false,
      customDiscounts: inv.custom_discounts ?? [],
      consumption: inv.consumption ?? [],
      note: inv.note ?? '',
    },
    roi: r.roi,
    cases: { title: r.cases_title, subtitle: r.cases_subtitle, caseIds: cases.map((c: Row) => c.case_id) },
    bureau: r.bureau && Object.keys(r.bureau).length ? r.bureau : defaultBureau(),
    createdBy: r.created_by ?? undefined,
    updatedBy: r.updated_by ?? undefined,
    closing: r.closing,
    sections: r.sections,
  }
}

function proposalToPayload(p: Proposal): Row {
  const calc = calcInvestment(p.investment)
  const i = p.investment
  return {
    id: p.id,
    status: p.status,
    template_id: p.templateId,
    client_name: p.client.contactName,
    company_name: p.client.company,
    cnpj: p.client.cnpj,
    city: p.client.city,
    state: p.client.state,
    segment: p.client.segment,
    stations: p.client.stations,
    cnpjs: p.client.cnpjs,
    contact_role: p.client.contactRole,
    contact_email: p.client.email,
    contact_phone: p.client.phone,
    client_logo: p.client.logo,
    title: p.meta.title,
    product: p.meta.product,
    proposal_date: p.meta.date,
    valid_until: p.meta.validity,
    executive_id: p.meta.executiveId ?? '',
    executive: p.meta.executive,
    cover_title: p.cover.title,
    cover_subtitle: p.cover.subtitle,
    cover_image: p.cover.image,
    cases_title: p.cases.title,
    cases_subtitle: p.cases.subtitle,
    roi: p.roi,
    bureau: p.bureau,
    created_by: p.createdBy ?? null,
    updated_by: p.updatedBy ?? null,
    closing: p.closing,
    sections: p.sections,
    created_at: p.createdAt,
    scenario: {
      title: p.scenario.title,
      subtitle: p.scenario.subtitle,
      current_operation: p.scenario.currentOperation,
      body: p.scenario.body,
      challenges: p.scenario.challenges,
      opportunities: p.scenario.opportunities,
    },
    project: {
      title: p.project.title,
      subtitle: p.project.subtitle,
      objective: p.project.objective,
      strategy: p.project.strategy,
      description: p.project.howCibusHelps,
      module_ids: p.project.moduleIds,
    },
    investment: {
      stations: i.stations,
      implementation_price: calc.implementation.table,
      implementation_first: i.implementationFirst,
      implementation_additional: i.implementationAdditional,
      implementation_discount_type: i.implementationDiscount.type,
      implementation_discount_value: i.implementationDiscount.value,
      implementation_discount: calc.implementation.discount,
      implementation_final: calc.implementation.final,
      implementation_free: i.implementationFree,
      monthly_price: i.monthlyPrice,
      monthly_discount_type: i.monthlyDiscount.type,
      monthly_discount_value: i.monthlyDiscount.value,
      monthly_discount: calc.monthly.discount,
      monthly_final: calc.monthly.final,
      custom_discounts: i.customDiscounts,
      consumption: i.consumption,
      note: i.note,
    },
    // itens inclusos (sem preço: a mensalidade é por posto)
    modules: i.items.map((m) => ({
      id: m.id,
      module_id: m.moduleId ?? '',
      name: m.name,
      description: '',
      table_price: 0,
      discount: 0,
      final_price: 0,
      included: m.included,
    })),
    case_ids: p.cases.caseIds,
  }
}

const caseFromRow = (r: Row): CaseDef => ({
  id: r.id,
  name: r.name,
  company: r.company,
  segment: r.segment,
  location: r.location,
  headline: r.headline,
  description: r.description,
  logo: r.logo,
  image: r.image,
  active: r.active,
  metrics: [1, 2, 3, 4]
    .map((n): CaseMetric => ({ name: r[`metric_${n}_name`] ?? '', value: r[`metric_${n}_value`] ?? '' }))
    .filter((m) => m.name || m.value),
})

const caseToRow = (c: CaseDef): Row => {
  const row: Row = {
    id: c.id,
    name: c.name,
    company: c.company,
    segment: c.segment,
    location: c.location,
    headline: c.headline,
    description: c.description,
    logo: c.logo,
    image: c.image,
    active: c.active,
  }
  ;[0, 1, 2, 3].forEach((i) => {
    row[`metric_${i + 1}_name`] = c.metrics[i]?.name ?? ''
    row[`metric_${i + 1}_value`] = c.metrics[i]?.value ?? ''
  })
  return row
}

const moduleFromRow = (r: Row): ModuleDef => ({
  id: r.id,
  name: r.name,
  description: r.description,
  category: r.category,
  defaultPrice: Number(r.default_price),
  active: r.active,
  sortOrder: r.sort_order,
})

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

export function createSupabaseRepository(sb: SupabaseClient): Repository {
  return {
    mode: 'supabase',
    async listProposals() {
      const data = check(await sb.from('proposals').select(PROPOSAL_SELECT).order('updated_at', { ascending: false }))
      return (data ?? []).map(rowToProposal)
    },
    async getProposal(id) {
      const data = check(await sb.from('proposals').select(PROPOSAL_SELECT).eq('id', id).maybeSingle())
      return data ? rowToProposal(data) : null
    },
    async saveProposal(p) {
      check(await sb.rpc('save_proposal', { p: proposalToPayload(p) }))
    },
    async deleteProposal(id) {
      check(await sb.from('proposals').delete().eq('id', id))
    },

    async listModules() {
      const data = check(await sb.from('modules').select('*').order('sort_order'))
      return (data ?? []).map(moduleFromRow)
    },
    async saveModule(m) {
      check(
        await sb.from('modules').upsert({
          id: m.id,
          name: m.name,
          description: m.description,
          category: m.category,
          default_price: m.defaultPrice,
          active: m.active,
          sort_order: m.sortOrder,
        }),
      )
    },
    async deleteModule(id) {
      check(await sb.from('modules').delete().eq('id', id))
    },

    async listCases() {
      const data = check(await sb.from('cases').select('*').order('created_at'))
      return (data ?? []).map(caseFromRow)
    },
    async saveCase(c) {
      check(await sb.from('cases').upsert(caseToRow(c)))
    },
    async deleteCase(id) {
      check(await sb.from('cases').delete().eq('id', id))
    },

    async listExecutives() {
      const data = check(await sb.from('executives').select('*').order('name'))
      return (data ?? []) as Executive[]
    },
    async saveExecutive(e) {
      check(await sb.from('executives').upsert(e))
    },
    async deleteExecutive(id) {
      check(await sb.from('executives').delete().eq('id', id))
    },

    async getSettings() {
      const data = check(await sb.from('settings').select('data').eq('id', 1).maybeSingle())
      return (data?.data as AppSettings) ?? null
    },
    async saveSettings(s) {
      check(await sb.from('settings').upsert({ id: 1, data: s, updated_at: new Date().toISOString() }))
    },

    async uploadImage(file) {
      const blob = await prepareImage(file)
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/svg+xml' ? 'svg' : 'jpg'
      const path = `${crypto.randomUUID()}.${ext}`
      check(await sb.storage.from('assets').upload(path, blob, { contentType: blob.type, upsert: false }))
      return sb.storage.from('assets').getPublicUrl(path).data.publicUrl
    },

    async whoAmI() {
      const { data } = await sb.auth.getUser()
      return data.user ? { id: data.user.id, name: data.user.email ?? '' } : null
    },
    // Sem diretório de pessoas: o nome guardado na proposta (e-mail do login) é usado.
    resolvePeople: async () => ({}),
  }
}
