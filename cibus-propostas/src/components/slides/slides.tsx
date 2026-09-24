import type { ReactNode } from 'react'
import { ArrowRight, BadgeCheck, Check, Globe, Mail, MapPin, MessageCircle, Phone, Sparkles } from 'lucide-react'
import appMockup from '@/assets/brand/app-cibus.webp'
import { calcInvestment, formatBRL, formatBRLShort, formatPercent, formatUnitPrice } from '@/lib/pricing'
import type { AppSettings, CaseDef, ModuleDef, Proposal, SlideKey } from '@/lib/types'
import { cn, formatDateShort, initials, textLength } from '@/lib/utils'
import { CibusLogo, FitBox, Highlight, RichHtml, Slide, SlideFooter, SlideHeader, SlideLink } from './primitives'

export interface DeckContext {
  settings: AppSettings
  modules: ModuleDef[]
  cases: CaseDef[]
}

export interface DeckSlide {
  id: string
  key: SlideKey
  label: string
  element: ReactNode
}

interface Common {
  p: Proposal
  ctx: DeckContext
  page: number
  total: number
  index: number // número da seção (kicker)
}

const Footer = ({ p, ctx, page, total, dark, left }: Common & { dark?: boolean; left?: number }) => (
  <SlideFooter
    left={left}
    page={page}
    total={total}
    company={p.client.company}
    logo={dark ? ctx.settings.logoDark : ctx.settings.logo}
    dark={dark}
  />
)

/* =========================================================================
 * 01 — CAPA
 * ======================================================================= */

export function CoverSlide({ p, ctx }: Common) {
  const info = [
    { k: 'Cliente', v: p.client.company || p.client.contactName || '—' },
    { k: 'Produto', v: p.meta.product || '—' },
    { k: 'Data', v: formatDateShort(p.meta.date) || '—' },
  ]
  const exec = p.meta.executive
  return (
    <Slide className="bg-mist">
      {/* textura sutil */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{ backgroundImage: 'radial-gradient(rgb(16 24 40 / 0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />
      <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-brand/[0.07] blur-3xl" />

      {/* Logos */}
      <div className="absolute left-[72px] top-[52px] flex items-center gap-5">
        <CibusLogo src={ctx.settings.logo} height={34} />
        {p.client.logo && (
          <>
            <span className="h-8 w-px bg-slate-300" />
            <img src={p.client.logo} alt="" className="h-9 max-w-[150px] object-contain" />
          </>
        )}
      </div>

      {/* Texto */}
      <div className="absolute left-[72px] top-[150px] w-[600px]">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-brand/25 bg-white px-4 py-1.5 text-[13px] font-bold uppercase tracking-[0.16em] text-brand shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {p.cover.subtitle || 'Proposta Comercial Cibus'}
        </div>
        <FitBox
          id="cover-title"
          label="Título da capa"
          max={60}
          min={38}
          lineHeight={1.04}
          className="mt-6 h-[260px] font-extrabold text-ink"
          style={{ letterSpacing: '-0.04em' }}
        >
          <Highlight text={p.cover.title} />
        </FitBox>
      </div>

      {/* Cards de informação */}
      <div className="absolute left-[72px] top-[478px] flex w-[600px] gap-3">
        {info.map((i, n) => (
          <div key={i.k} style={{ flex: n === 0 ? 1.35 : 1 }} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_-12px_rgba(16,24,40,.18)]">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{i.k}</div>
            <div className="mt-1.5 truncate text-[17px] font-bold text-ink" style={{ letterSpacing: '-0.01em' }}>
              {i.v}
            </div>
          </div>
        ))}
      </div>
      {p.meta.validity && <div className="absolute left-[72px] top-[576px] text-[13px] font-medium text-slate-400">{p.meta.validity}</div>}

      {/* Imagem */}
      <div className="absolute bottom-[84px] right-[48px] top-[40px] w-[500px] overflow-hidden rounded-t-[36px] bg-ink">
        {p.cover.image ? (
          <>
            <img src={p.cover.image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink/40 to-transparent" />
          </>
        ) : (
          <>
            {/* Arte padrão: o app Cibus */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 30%, rgb(var(--brand) / 0.55), transparent 60%)' }} />
            <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full border-2 border-brand/30" />
            <div className="absolute -right-44 -top-44 h-[600px] w-[600px] rounded-full border border-brand/15" />
            <div
              className="absolute bottom-10 left-8 h-40 w-40 opacity-40"
              style={{ backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.35) 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }}
            />
            <img
              src={appMockup}
              alt=""
              className="absolute left-1/2 top-[44px] h-[640px] w-auto max-w-none -translate-x-1/2 drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]"
            />
          </>
        )}
      </div>
      <div className="absolute bottom-[84px] right-[548px] h-14 w-14 rounded-tl-[22px] bg-brand" />

      {/* Faixa inferior */}
      <div className="absolute inset-x-0 bottom-0 flex h-[84px] items-center justify-between bg-ink px-[72px]">
        <div className="flex items-center gap-4">
          {exec.photo ? (
            <img src={exec.photo} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-white/15" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-[15px] font-bold text-white">
              {initials(exec.name)}
            </div>
          )}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Apresentado por</div>
            <div className="text-[17px] font-bold text-white">
              {exec.name || 'Executivo Cibus'}
              {exec.role && <span className="font-medium text-white/50"> · {exec.role}</span>}
            </div>
          </div>
        </div>
        <div className="text-[14px] font-semibold text-white/60">{ctx.settings.site}</div>
      </div>
    </Slide>
  )
}

/* =========================================================================
 * 02 — CENÁRIO ATUAL
 * ======================================================================= */

const MAX_CHALLENGES = 5
const MAX_OPPS = 4

export function ScenarioSlide(c: Common) {
  const { p } = c
  const s = p.scenario
  const challenges = s.challenges.filter(Boolean)
  const opps = s.opportunities.filter(Boolean)
  const shownChallenges = challenges.slice(0, MAX_CHALLENGES)
  const extraChallenges = challenges.length - shownChallenges.length
  const shownOpps = opps.slice(0, MAX_OPPS)
  const hasBody = !!(s.currentOperation.trim() || textLength(s.body))
  const top = 206
  const bottomOpps = opps.length ? 190 : 0
  const mainBottom = 78 + bottomOpps

  return (
    <Slide className="bg-white">
      <SlideHeader index={c.index} kicker="Cenário atual" title={s.title || 'O cenário atual'} subtitle={s.subtitle} />

      <div className="absolute left-[72px] right-[72px] flex gap-8" style={{ top, bottom: mainBottom }}>
        {/* Texto principal */}
        {hasBody && (
          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="absolute -left-[22px] bottom-1 top-1 w-[3px] rounded-full bg-brand" />
            {s.currentOperation.trim() && (
              <FitBox
                id="scenario-lead"
                label="Operação atual"
                max={23}
                min={18}
                lineHeight={1.35}
                className={cn('shrink-0 font-semibold text-ink', textLength(s.body) ? 'max-h-[40%]' : 'flex-1')}
                style={{ letterSpacing: '-0.015em' }}
              >
                {s.currentOperation}
              </FitBox>
            )}
            {textLength(s.body) > 0 && (
              <FitBox
                id="scenario-body"
                label="Texto do cenário atual"
                max={17}
                min={14}
                lineHeight={1.55}
                className={cn('min-h-0 flex-1 text-slate-600', s.currentOperation.trim() && 'mt-4')}
              >
                <RichHtml html={s.body} />
              </FitBox>
            )}
          </div>
        )}

        {/* Desafios */}
        {shownChallenges.length > 0 && (
          <div
            className={cn(
              'relative flex shrink-0 flex-col overflow-hidden rounded-[26px] bg-ink p-7 text-white',
              hasBody ? 'w-[420px]' : 'flex-1',
            )}
          >
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[18px] border-brand/20" />
            <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-brand">Principais desafios</div>
            <FitBox id="scenario-challenges" label="Principais desafios" max={18} min={14} lineHeight={1.3} className="mt-4 min-h-0 flex-1">
              <ul className={cn('space-y-[0.75em]', !hasBody && 'grid grid-cols-2 gap-x-8 space-y-0 gap-y-[0.75em]')}>
                {shownChallenges.map((ch, i) => (
                  <li key={i} className="flex items-start gap-3.5">
                    <span className="mt-[0.1em] flex h-[1.45em] w-[1.45em] shrink-0 items-center justify-center rounded-full bg-brand/15 text-[0.72em] font-bold text-brand">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-white/90">{ch}</span>
                  </li>
                ))}
              </ul>
              {extraChallenges > 0 && <div className="mt-3 text-[0.8em] font-semibold text-white/45">+ {extraChallenges} outros pontos mapeados</div>}
            </FitBox>
          </div>
        )}
      </div>

      {/* Oportunidades */}
      {shownOpps.length > 0 && (
        <div className="absolute bottom-[78px] left-[72px] right-[72px]" style={{ height: bottomOpps - 24 }}>
          <div className="mb-3 flex items-center gap-3 text-[12px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Oportunidades
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid h-[calc(100%-30px)] gap-3" style={{ gridTemplateColumns: `repeat(${shownOpps.length}, minmax(0, 1fr))` }}>
            {shownOpps.map((o, i) => (
              <div key={i} className="flex flex-col rounded-[20px] border border-brand/15 bg-brand/[0.05] p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <FitBox id={`scenario-opp-${i}`} label={`Oportunidade ${i + 1}`} max={16} min={13} lineHeight={1.3} className="mt-3 min-h-0 flex-1 font-bold text-ink">
                  {o}
                </FitBox>
              </div>
            ))}
          </div>
        </div>
      )}
      <Footer {...c} />
    </Slide>
  )
}

/* =========================================================================
 * 03 — O PROJETO
 * ======================================================================= */

export function ProjectSlide(c: Common) {
  const { p, ctx } = c
  const pr = p.project
  const blocks = [
    { id: 'objective', title: 'Objetivo do projeto', html: pr.objective },
    { id: 'strategy', title: 'Estratégia proposta', html: pr.strategy },
    { id: 'help', title: 'Como o Cibus ajuda', html: pr.howCibusHelps },
  ].filter((b) => textLength(b.html) > 0)

  const selected = ctx.modules.filter((m) => pr.moduleIds.includes(m.id))
  const byCat = selected.reduce<Record<string, ModuleDef[]>>((acc, m) => {
    ;(acc[m.category] ||= []).push(m)
    return acc
  }, {})
  const cats = Object.entries(byCat)
  const modulesH = cats.length ? (cats.length > 3 ? 182 : 124) : 0

  return (
    <Slide className="bg-white">
      <SlideHeader index={c.index} kicker="O projeto" title={pr.title || 'O projeto'} subtitle={pr.subtitle} />

      <div
        className="absolute left-[72px] right-[72px] grid gap-4"
        style={{
          top: 206,
          bottom: 78 + (modulesH ? modulesH + 20 : 0),
          gridTemplateColumns: `repeat(${Math.max(1, blocks.length)}, minmax(0, 1fr))`,
        }}
      >
        {blocks.map((b, i) => {
          const dark = i === blocks.length - 1 && blocks.length > 1
          return (
            <div
              key={b.id}
              className={cn(
                'relative flex min-h-0 flex-col overflow-hidden rounded-[24px] p-7',
                dark ? 'bg-ink text-white' : 'border border-slate-200 bg-mist',
              )}
            >
              {dark && <div className="absolute -bottom-20 -right-20 h-52 w-52 rounded-full border-[20px] border-brand/15" />}
              <div className="flex items-center gap-3">
                <span className="text-[30px] font-extrabold tabular-nums leading-none text-brand" style={{ letterSpacing: '-0.04em' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={cn('text-[17px] font-bold', dark ? 'text-white' : 'text-ink')}>{b.title}</span>
              </div>
              <FitBox
                id={`project-${b.id}`}
                label={b.title}
                max={blocks.length === 1 ? 19 : 16}
                min={13}
                lineHeight={1.5}
                className={cn('relative mt-4 min-h-0 flex-1', dark ? 'text-white/75' : 'text-slate-600')}
              >
                <RichHtml html={b.html} />
              </FitBox>
            </div>
          )
        })}
      </div>

      {cats.length > 0 && (
        <div
          className="absolute bottom-[78px] left-[72px] right-[72px] rounded-[22px] border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_32px_-18px_rgba(16,24,40,.25)]"
          style={{ height: modulesH }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-brand">Módulos do projeto</span>
            <span className="text-[12px] font-semibold text-slate-400">{selected.length} módulos</span>
          </div>
          <FitBox id="project-modules" label="Módulos do projeto" max={13.5} min={10.5} className="h-[calc(100%-30px)]">
            <div className="grid gap-x-6 gap-y-3" style={{ gridTemplateColumns: `repeat(${Math.min(cats.length, 3)}, minmax(0,1fr))` }}>
              {cats.map(([cat, mods]) => (
                <div key={cat} className="min-w-0">
                  <div className="mb-1.5 text-[0.78em] font-bold uppercase tracking-[0.14em] text-slate-400">{cat}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {mods.map((m) => (
                      <span key={m.id} className="rounded-full bg-ink/[0.05] px-[0.8em] py-[0.3em] font-semibold text-ink">
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FitBox>
        </div>
      )}
      <Footer {...c} />
    </Slide>
  )
}

/* =========================================================================
 * 04 — INVESTIMENTOS
 * ======================================================================= */

export function InvestmentSlide(c: Common) {
  const { p } = c
  const inv = p.investment
  const calc = calcInvestment(inv)
  const items = inv.items.filter((i) => i.included && i.name.trim())
  const hasDiscount = calc.monthly.discount > 0.009
  const consumption = inv.consumption.filter((x) => x.name.trim())
  const impl = calc.implementation

  return (
    <Slide className="bg-mist">
      <SlideHeader
        index={c.index}
        kicker="Investimentos"
        title="Investimento *por posto*"
        subtitle={calc.stations > 1 ? `Condição para a rede com ${calc.stations} postos` : p.meta.product ? `${p.meta.product}` : undefined}
      />

      {/* Card escuro principal */}
      <div className="absolute left-[72px] top-[196px] flex h-[334px] w-[440px] flex-col overflow-hidden rounded-[28px] bg-ink p-8 text-white shadow-[0_30px_60px_-30px_rgba(16,24,40,.6)]">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border-[26px] border-brand/15" />
        <div className="absolute -right-6 bottom-6 h-24 w-24 rounded-full bg-brand/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/55">Mensalidade</span>
          {hasDiscount && (
            <span className="rounded-full bg-brand px-3 py-1 text-[12px] font-bold text-white">
              -{formatPercent(Math.round(calc.monthly.discountPercent))}
            </span>
          )}
        </div>
        <div className="relative mt-auto">
          {hasDiscount && (
            <div className="text-[16px] font-semibold text-white/45">
              de <span className="line-through decoration-brand/80 decoration-2">{formatBRL(calc.monthly.table)}</span> por
            </div>
          )}
          <div className="mt-1 flex items-end gap-3">
            <span className="text-[76px] font-extrabold leading-[0.95] text-brand" style={{ letterSpacing: '-0.05em' }}>
              {formatBRLShort(calc.monthly.final)}
            </span>
          </div>
          <div className="mt-2 text-[17px] font-semibold text-white/80">/mês por posto</div>
          {calc.stations > 1 && (
            <div className="mt-4 border-t border-white/10 pt-4 text-[15px] font-semibold text-white/70">
              <span className="text-white">{formatBRL(calc.monthlyNetwork.final)}</span>/mês · total da rede ({calc.stations} postos)
            </div>
          )}
          {inv.note && (
            <div className="mt-4 flex items-center gap-2 text-[15px] font-semibold text-white">
              <BadgeCheck className="h-5 w-5 text-brand" /> {inv.note}
            </div>
          )}
        </div>
      </div>

      {/* O que está incluso */}
      <div className="absolute left-[536px] right-[72px] top-[196px] flex h-[334px] flex-col rounded-[28px] border border-slate-200 bg-white px-7 py-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-brand">O que está incluso</span>
          <span className="text-[12px] font-semibold text-slate-400">
            {items.length} {items.length === 1 ? 'recurso' : 'recursos'}
          </span>
        </div>
        <FitBox id="investment-included" label="O que está incluso" max={16} min={11} lineHeight={1.25} className="min-h-0 flex-1 pt-4">
          <div className={cn('grid gap-x-6 gap-y-[0.7em]', items.length > 5 ? 'grid-cols-2' : 'grid-cols-1')}>
            {items.map((it) => (
              <div key={it.id} className="flex min-w-0 items-center gap-[0.65em]">
                <span className="flex h-[1.35em] w-[1.35em] shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-[0.8em] w-[0.8em]" strokeWidth={3.5} />
                </span>
                <span className="min-w-0 font-bold text-ink">{it.name}</span>
              </div>
            ))}
          </div>
        </FitBox>
      </div>

      {/* Implantação + consumo */}
      <div className="absolute bottom-[78px] left-[72px] right-[72px] top-[546px] flex gap-4">
        <div
          className={cn(
            'flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-white px-7',
            consumption.length ? 'w-[440px] shrink-0' : 'flex-1',
          )}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Implantação</div>
            <div className="mt-1 truncate text-[13px] font-medium text-slate-500">
              {impl.free
                ? 'Setup completo sem custo'
                : impl.additionalStations > 0
                  ? `${formatBRLShort(impl.first)} no 1º posto + ${impl.additionalStations} × ${formatBRLShort(impl.additional)}`
                  : 'Pagamento único'}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {!impl.free && impl.discount > 0 && (
              <div className="text-[13px] font-semibold text-slate-400 line-through decoration-brand/70">{formatBRLShort(impl.table)}</div>
            )}
            <div className="text-[30px] font-extrabold leading-none text-brand" style={{ letterSpacing: '-0.03em' }}>
              {impl.free ? 'Isenta' : formatBRLShort(impl.final)}
            </div>
          </div>
        </div>
        {consumption.length > 0 && (
          <div className="flex min-w-0 flex-1 items-center gap-6 rounded-[22px] border border-slate-200 bg-white px-7">
            <div className="shrink-0 text-[11px] font-bold uppercase leading-[1.5] tracking-[0.16em] text-slate-400">
              Sob
              <br />
              consumo
            </div>
            <div className="h-10 w-px shrink-0 bg-slate-200" />
            <div className="flex min-w-0 flex-1 items-center justify-around gap-5">
              {consumption.slice(0, 3).map((ci) => (
                <div key={ci.id} className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-slate-500">{ci.name}</div>
                  <div className="whitespace-nowrap text-[18px] font-extrabold text-ink">
                    {formatUnitPrice(ci.price)}
                    <span className="text-[13px] font-semibold text-slate-400">/{ci.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer {...c} />
    </Slide>
  )
}

/* =========================================================================
 * 05 — ROI
 * ======================================================================= */

export function RoiSlide(c: Common) {
  const { p, ctx } = c
  const r = p.roi
  const url = r.url || ctx.settings.roiUrl
  const inds = r.indicators.filter((i) => i.label.trim()).slice(0, 4)
  return (
    <Slide className="bg-ink">
      <div className="absolute -right-44 -top-44 h-[560px] w-[560px] rounded-full border-[46px] border-brand/10" />
      <div className="absolute -right-10 -top-10 h-[300px] w-[300px] rounded-full border-[2px] border-brand/25" />
      <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />

      <SlideHeader index={c.index} kicker="ROI" title={r.title} subtitle={r.subtitle} dark />

      <div className="absolute left-[72px] top-[222px] w-[640px] text-[26px] font-bold leading-[1.25] text-white" style={{ letterSpacing: '-0.02em' }}>
        {r.question}
      </div>

      <div className="absolute left-[72px] top-[330px] grid w-[640px] grid-cols-2 gap-3">
        {inds.map((i) => (
          <div key={i.id} className="rounded-[20px] border border-white/10 bg-white/[0.04] px-6 py-5">
            <div className="truncate text-[30px] font-extrabold leading-none text-brand" style={{ letterSpacing: '-0.03em' }}>
              {i.value || '—'}
            </div>
            <div className="mt-2.5 text-[15px] font-bold text-white">{i.label}</div>
            {i.hint && <div className="mt-0.5 line-clamp-1 text-[12.5px] font-medium text-white/50">{i.hint}</div>}
          </div>
        ))}
      </div>

      <div className="absolute bottom-[78px] right-[72px] top-[222px] flex w-[420px] flex-col overflow-hidden rounded-[28px] bg-brand p-9 text-white">
        <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full border-[22px] border-white/15" />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M15 7h6v6" />
          </svg>
        </div>
        <div className="mt-7 text-[32px] font-extrabold leading-[1.08]" style={{ letterSpacing: '-0.03em' }}>
          {r.ctaTitle}
        </div>
        <p className="mt-3 text-[16px] font-medium leading-[1.5] text-white/85">{r.ctaText}</p>
        <SlideLink
          href={url}
          className="relative mt-auto inline-flex h-[58px] items-center justify-between rounded-2xl bg-white px-6 text-[18px] font-extrabold text-ink shadow-[0_16px_30px_-12px_rgba(0,0,0,.35)]"
        >
          Simular ROI
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
            <ArrowRight className="h-5 w-5" />
          </span>
        </SlideLink>
      </div>
      <Footer {...c} dark />
    </Slide>
  )
}

/* =========================================================================
 * 06 — CASES
 * ======================================================================= */

function MetricValue({ value, big }: { value: string; big?: boolean }) {
  const parts = value.split(/\s*(?:→|->)\s*/)
  if (parts.length === 2) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-[0.3em]">
        <span className="text-slate-400" style={{ fontSize: big ? '0.62em' : '0.7em' }}>
          {parts[0]}
        </span>
        <ArrowRight className="h-[0.6em] w-[0.6em] self-center text-brand" strokeWidth={3} />
        <span>{parts[1]}</span>
      </span>
    )
  }
  return <>{value}</>
}

function CaseVisual({ cs, className }: { cs: CaseDef; className?: string }) {
  if (cs.image) return <img src={cs.image} alt="" className={cn('h-full w-full object-cover', className)} />
  return (
    <div className={cn('relative flex h-full w-full items-center justify-center overflow-hidden bg-ink', className)}>
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full border-[30px] border-brand/15" />
      <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-brand/15 blur-2xl" />
      {cs.logo ? (
        <img src={cs.logo} alt="" className="relative max-h-[40%] max-w-[60%] object-contain" />
      ) : (
        <span className="relative text-[96px] font-extrabold text-white/90" style={{ letterSpacing: '-0.05em' }}>
          {initials(cs.name)}
        </span>
      )}
    </div>
  )
}

export function CasesOverviewSlide(c: Common & { list: CaseDef[] }) {
  const { p, list } = c
  return (
    <Slide className="bg-mist">
      <SlideHeader index={c.index} kicker="Cases" title={p.cases.title} subtitle={p.cases.subtitle} />
      <div
        className="absolute bottom-[78px] left-[72px] right-[72px] top-[222px] grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(list.length, 4)}, minmax(0,1fr))` }}
      >
        {list.slice(0, 4).map((cs) => {
          const m = cs.metrics.find((x) => x.value)
          return (
            <div key={cs.id} className="flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="relative h-[46%] shrink-0">
                <CaseVisual cs={cs} />
                {cs.logo && cs.image && (
                  <div className="absolute bottom-3 left-3 rounded-xl bg-white px-3 py-2 shadow">
                    <img src={cs.logo} alt="" className="h-6 max-w-[110px] object-contain" />
                  </div>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-5">
                <div className="truncate text-[20px] font-extrabold text-ink" style={{ letterSpacing: '-0.02em' }}>
                  {cs.name}
                </div>
                <div className="mt-0.5 truncate text-[13px] font-semibold text-slate-400">
                  {[cs.segment, cs.location].filter(Boolean).join(' · ')}
                </div>
                {m && (
                  <div className="mt-auto">
                    <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">{m.name}</div>
                    <div className="mt-1 text-[22px] font-extrabold leading-tight text-ink">
                      <MetricValue value={m.value} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <Footer {...c} />
    </Slide>
  )
}

export function CaseSlide(c: Common & { cs: CaseDef; single: boolean }) {
  const { cs, p, single } = c
  const metrics = cs.metrics.filter((m) => m.name || m.value).slice(0, 4)
  const hasDesc = textLength(cs.description) > 0
  return (
    <Slide className="bg-white">
      <div className="absolute bottom-0 left-0 top-0 w-[468px]">
        <CaseVisual cs={cs} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        {cs.logo && cs.image && (
          <div className="absolute left-8 top-8 rounded-2xl bg-white px-4 py-3 shadow-lg">
            <img src={cs.logo} alt="" className="h-8 max-w-[150px] object-contain" />
          </div>
        )}
        {(cs.location || cs.segment) && (
          <div className="absolute bottom-8 left-8 right-8 flex flex-wrap gap-2">
            {cs.segment && <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur">{cs.segment}</span>}
            {cs.location && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white">
                <MapPin className="h-3.5 w-3.5" /> {cs.location}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-[78px] left-[532px] right-[72px] top-[52px] flex flex-col justify-center">
        <div className="flex items-center gap-3 text-[13px] font-bold uppercase tracking-[0.18em] text-brand">
          <span className="tabular-nums">{String(c.index).padStart(2, '0')}</span>
          <span className="h-[2px] w-7 rounded-full bg-brand" />
          <span className="truncate">{single ? p.cases.title : 'Case de sucesso'}</span>
        </div>
        <h2 className="mt-4 text-[48px] font-extrabold leading-[1.02] text-ink" style={{ letterSpacing: '-0.04em' }}>
          {cs.name}
        </h2>
        {cs.headline && (
          <p className="mt-3 text-[21px] font-semibold leading-[1.3] text-slate-500" style={{ letterSpacing: '-0.01em' }}>
            {cs.headline}
          </p>
        )}

        {metrics.length > 0 && (
          <div className={cn('mt-7 grid gap-3', metrics.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {metrics.map((m, i) => (
              <div
                key={i}
                className={cn('rounded-[20px] px-6 py-5', i === 0 ? 'bg-ink text-white' : 'border border-slate-200 bg-mist text-ink')}
              >
                <div className={cn('text-[12px] font-bold uppercase tracking-[0.14em]', i === 0 ? 'text-white/55' : 'text-slate-400')}>{m.name}</div>
                <div
                  className={cn('mt-2 font-extrabold leading-[1.1]', i === 0 ? 'text-brand' : 'text-ink', metrics.length > 2 ? 'text-[26px]' : 'text-[32px]')}
                  style={{ letterSpacing: '-0.03em' }}
                >
                  <MetricValue value={m.value} big />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasDesc && (
          <FitBox id={`case-${cs.id}-desc`} label={`Descrição do case ${cs.name}`} max={16} min={13} lineHeight={1.55} className="mt-6 max-h-[250px] min-h-0 shrink text-slate-600">
            <RichHtml html={cs.description} />
          </FitBox>
        )}
      </div>
      <Footer {...c} left={532} />
    </Slide>
  )
}

/* =========================================================================
 * 07 — ENCERRAMENTO
 * ======================================================================= */

export function ClosingSlide(c: Common) {
  const { p, ctx } = c
  const e = p.meta.executive
  const wa = (e.whatsapp || '').replace(/\D/g, '')
  const phone = e.phone || ctx.settings.contactPhone
  const email = e.email || ctx.settings.contactEmail
  const site = ctx.settings.site
  const contacts = [
    phone && { icon: Phone, label: 'Telefone', value: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}` },
    e.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: e.whatsapp, href: `https://wa.me/${wa.length <= 11 ? '55' + wa : wa}` },
    email && { icon: Mail, label: 'E-mail', value: email, href: `mailto:${email}` },
    site && { icon: Globe, label: 'Site', value: site, href: site.startsWith('http') ? site : `https://${site}` },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string }[]

  return (
    <Slide className="bg-ink">
      <div className="absolute -left-52 -top-52 h-[620px] w-[620px] rounded-full border-[60px] border-brand/[0.08]" />
      <div className="absolute bottom-[-180px] right-[380px] h-96 w-96 rounded-full bg-brand/15 blur-3xl" />

      <div className="absolute left-[72px] top-[56px]">
        <CibusLogo src={ctx.settings.logoDark} dark height={34} />
      </div>

      <div className="absolute left-[72px] top-[170px] w-[640px]">
        <FitBox id="closing-title" label="Título do encerramento" max={56} min={36} lineHeight={1.05} className="h-[280px] font-extrabold text-white" style={{ letterSpacing: '-0.04em' }}>
          <Highlight text={p.closing.title} />
        </FitBox>
        {p.closing.cta && (
          <div className="mt-10 inline-flex h-[62px] items-center gap-4 rounded-2xl bg-brand pl-7 pr-3 text-[20px] font-extrabold text-white shadow-[0_20px_40px_-16px_rgb(var(--brand)/.8)]">
            {p.closing.cta}
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        )}
      </div>

      <div className="absolute right-[72px] top-1/2 flex w-[400px] -translate-y-1/2 flex-col rounded-[28px] bg-white p-8 shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)]">
        <div className="flex items-center gap-4">
          {e.photo ? (
            <img src={e.photo} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-[22px] font-extrabold text-white">{initials(e.name)}</div>
          )}
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Seu executivo</div>
            <div className="truncate text-[21px] font-extrabold text-ink" style={{ letterSpacing: '-0.02em' }}>
              {e.name || 'Executivo Cibus'}
            </div>
            {e.role && <div className="truncate text-[14px] font-semibold text-slate-500">{e.role}</div>}
          </div>
        </div>
        <div className="mt-6 flex flex-col divide-y divide-slate-100 border-t border-slate-100 pt-1">
          {contacts.map((ct) => (
            <SlideLink key={ct.label} href={ct.href} className="flex items-center gap-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <ct.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{ct.label}</span>
                <span className="block truncate text-[16px] font-bold text-ink">{ct.value}</span>
              </span>
            </SlideLink>
          ))}
        </div>
      </div>
      <Footer {...c} dark />
    </Slide>
  )
}

/* =========================================================================
 * Montagem do deck
 * ======================================================================= */

export function selectedCases(p: Proposal, ctx: DeckContext): CaseDef[] {
  return p.cases.caseIds.map((id) => ctx.cases.find((c) => c.id === id)).filter((c): c is CaseDef => !!c)
}

export function buildDeck(p: Proposal, ctx: DeckContext): DeckSlide[] {
  type Spec = { key: SlideKey; label: string; id: string; render: (c: Common) => ReactNode }
  const specs: Spec[] = []
  const on = (k: SlideKey) => p.sections[k] !== false

  if (on('cover')) specs.push({ key: 'cover', id: 'cover', label: 'Capa', render: (c) => <CoverSlide {...c} /> })
  if (on('scenario')) specs.push({ key: 'scenario', id: 'scenario', label: 'Cenário atual', render: (c) => <ScenarioSlide {...c} /> })
  if (on('project')) specs.push({ key: 'project', id: 'project', label: 'O projeto', render: (c) => <ProjectSlide {...c} /> })
  if (on('investment')) specs.push({ key: 'investment', id: 'investment', label: 'Investimentos', render: (c) => <InvestmentSlide {...c} /> })
  if (on('roi')) specs.push({ key: 'roi', id: 'roi', label: 'ROI', render: (c) => <RoiSlide {...c} /> })
  if (on('cases')) {
    const list = selectedCases(p, ctx)
    if (list.length > 1)
      specs.push({ key: 'cases', id: 'cases-overview', label: 'Cases', render: (c) => <CasesOverviewSlide {...c} list={list} /> })
    list.forEach((cs) =>
      specs.push({
        key: 'cases',
        id: `case-${cs.id}`,
        label: cs.name,
        render: (c) => <CaseSlide {...c} cs={cs} single={list.length === 1} />,
      }),
    )
  }
  if (on('closing')) specs.push({ key: 'closing', id: 'closing', label: 'Encerramento', render: (c) => <ClosingSlide {...c} /> })

  // número de seção (kicker) — segue a navegação: 01 Capa, 02 Cenário…
  const sectionOrder: SlideKey[] = [...new Set(specs.map((s) => s.key))]
  const total = specs.length
  return specs.map((s, i) => ({
    id: s.id,
    key: s.key,
    label: s.label,
    element: s.render({ p, ctx, page: i + 1, total, index: sectionOrder.indexOf(s.key) + 1 }),
  }))
}
