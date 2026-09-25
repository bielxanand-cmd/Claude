import { useMemo, useState } from 'react'
import { Loading, NotFound } from '@/components/status-pages'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, Check, ChevronDown, Circle, Eye, FileDown, Loader2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClientForm, ClosingForm, CoverForm, ProposalMetaForm } from '@/components/forms/client-forms'
import { CasesForm, ProjectForm, RoiForm, ScenarioForm } from '@/components/forms/content-forms'
import { FinancialSummary, InvestmentForm } from '@/components/forms/investment-form'
import { OverflowWarnings, ProposalTopBar } from '@/components/proposal-chrome'
import { OverflowScope, SlideFrame, useOverflowCollector } from '@/components/slides/frame'
import { buildDeck, type DeckSlide } from '@/components/slides/slides'
import { useProposal } from '@/hooks/use-proposal'
import { usePdfExport } from '@/hooks/use-pdf'
import { useAppData } from '@/lib/app-data'
import { calcInvestment } from '@/lib/pricing'
import { STATUS_LABEL, type ProposalStatus, type SlideKey } from '@/lib/types'
import { validateProposal, type StepKey } from '@/lib/validation'
import { cn } from '@/lib/utils'

const STEPS: { key: StepKey; label: string; slide?: SlideKey; title: string; description: string }[] = [
  { key: 'client', label: 'Cliente', slide: 'cover', title: 'Dados do cliente', description: 'Quem é o cliente e como a capa vai ficar.' },
  { key: 'scenario', label: 'Cenário', slide: 'scenario', title: 'Cenário atual', description: 'O momento do cliente, desafios e oportunidades.' },
  { key: 'project', label: 'Projeto', slide: 'project', title: 'O projeto', description: 'Objetivo, estratégia e módulos Cibus da solução.' },
  { key: 'investment', label: 'Investimento', slide: 'investment', title: 'Investimentos', description: 'Módulos, valores, descontos e custos sob consumo.' },
  { key: 'roi', label: 'ROI', slide: 'roi', title: 'O retorno do Cibus', description: 'Indicadores e chamada para o simulador de ROI.' },
  { key: 'cases', label: 'Cases', slide: 'cases', title: 'Cases', description: 'Resultados de clientes que reforçam a proposta.' },
  { key: 'review', label: 'Revisão', title: 'Revisão', description: 'Confira tudo e gere o PDF.' },
]

export default function Wizard() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { proposal: p, update, save, saveState, notFound } = useProposal(id)
  const data = useAppData()
  const [showPreview, setShowPreview] = useState(false)
  const { overflow, makeReporter } = useOverflowCollector()

  const step = (STEPS.find((s) => s.key === params.get('step'))?.key ?? 'client') as StepKey
  const idx = STEPS.findIndex((s) => s.key === step)
  const go = (k: StepKey) => {
    setParams({ step: k }, { replace: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deck = useMemo(() => (p ? buildDeck(p, data) : []), [p, data])
  const checks = useMemo(() => (p ? validateProposal(p) : []), [p])

  if (notFound) return <NotFound />
  if (!p) return <Loading />

  const cur = STEPS[idx]!
  const stepSlides = cur.slide ? deck.filter((s) => s.key === cur.slide) : []
  const hiddenSection = cur.slide && !p.sections[cur.slide]
  const stepState = (k: StepKey) => {
    const c = checks.filter((x) => x.step === k)
    if (!c.length) return 'none'
    return c.every((x) => x.ok) ? 'ok' : 'todo'
  }
  const props = { p, update }
  const warnings = overflow.filter((o) => stepSlides.some((s) => s.id === o.slideId))

  return (
    <div className="min-h-screen">
      <ProposalTopBar p={p} saveState={saveState} onSave={save} mode="wizard" />

      {/* Progresso */}
      <div className="border-b bg-white">
        <div className="scrollbar-thin mx-auto flex max-w-[1500px] items-center gap-1 overflow-x-auto px-4 py-3 lg:px-6">
          {STEPS.map((s, i) => {
            const st = stepState(s.key)
            const active = s.key === step
            const done = i < idx || (st === 'ok' && !active)
            return (
              <div key={s.key} className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => go(s.key)}
                  className={cn(
                    'flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-semibold transition-all',
                    active ? 'bg-ink text-white shadow-soft' : 'text-ink/60 hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                      active ? 'bg-brand text-white' : done ? 'bg-brand/15 text-brand' : 'bg-ink/[0.06] text-ink/50',
                    )}
                  >
                    {done && !active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <div className={cn('h-[2px] w-5 rounded-full lg:w-8', i < idx ? 'bg-brand' : 'bg-ink/10')} />}
              </div>
            )
          })}
        </div>
        <div className="h-[3px] bg-ink/[0.04]">
          <div className="h-full bg-brand transition-all duration-500" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {step === 'review' ? (
        <Review deck={deck} checks={checks} go={go} p={p} update={update} save={save} overflow={overflow} makeReporter={makeReporter} />
      ) : (
        <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 lg:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 animate-fade-up space-y-5" key={step}>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                Etapa {idx + 1} de {STEPS.length}
              </div>
              <h2 className="mt-1 text-[28px] font-extrabold tracking-[-0.03em] text-ink">{cur.title}</h2>
              <p className="text-muted-foreground">{cur.description}</p>
            </div>

            {/* Prévia em telas menores */}
            <div className="xl:hidden">
              <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
                <Eye /> {showPreview ? 'Ocultar prévia' : 'Ver prévia do slide'}
                <ChevronDown className={cn('transition-transform', showPreview && 'rotate-180')} />
              </Button>
              {showPreview && (
                <div className="mt-3 space-y-3">
                  <Preview slides={stepSlides} makeReporter={makeReporter} hidden={!!hiddenSection} />
                </div>
              )}
            </div>

            {step === 'client' && (
              <>
                <ClientForm {...props} />
                <ProposalMetaForm {...props} />
                <CoverForm {...props} />
              </>
            )}
            {step === 'scenario' && <ScenarioForm {...props} />}
            {step === 'project' && <ProjectForm {...props} />}
            {step === 'investment' && <InvestmentForm {...props} showSummary={false} />}
            {step === 'roi' && <RoiForm {...props} />}
            {step === 'cases' && <CasesForm {...props} />}

            <div className="flex items-center justify-between border-t pt-6">
              <Button variant="outline" disabled={idx === 0} onClick={() => go(STEPS[idx - 1]!.key)}>
                <ArrowLeft /> Voltar
              </Button>
              <Button size="lg" onClick={() => go(STEPS[idx + 1]!.key)}>
                Próximo: {STEPS[idx + 1]!.label} <ArrowRight />
              </Button>
            </div>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-[88px] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Prévia ao vivo · PDF 16:9</span>
                <Button asChild variant="link" size="sm">
                  <Link to={`/propostas/${p.id}/editor`}>Abrir no editor visual</Link>
                </Button>
              </div>
              <OverflowWarnings items={warnings} />
              <div className="scrollbar-thin max-h-[calc(100vh-150px)] space-y-4 overflow-y-auto pb-6 pr-1">
                <Preview slides={stepSlides} makeReporter={makeReporter} hidden={!!hiddenSection} />
                {step === 'investment' && <FinancialSummary calc={calcInvestment(p.investment)} product={p.meta.product} />}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function Preview({ slides, makeReporter, hidden }: { slides: DeckSlide[]; makeReporter: ReturnType<typeof useOverflowCollector>['makeReporter']; hidden: boolean }) {
  if (hidden)
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed bg-white text-sm text-muted-foreground">
        Esta página está oculta e não entra no PDF.
      </div>
    )
  if (!slides.length)
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
        Selecione pelo menos um case para ver a prévia.
      </div>
    )
  return (
    <>
      {slides.map((s) => (
        <div key={s.id} className="overflow-hidden rounded-lg shadow-lift ring-1 ring-ink/5">
          <OverflowScope report={makeReporter(s.id)}>
            <SlideFrame>{s.element}</SlideFrame>
          </OverflowScope>
        </div>
      ))}
    </>
  )
}

function Review({
  deck,
  checks,
  go,
  p,
  update,
  save,
  overflow,
  makeReporter,
}: {
  deck: DeckSlide[]
  checks: ReturnType<typeof validateProposal>
  go: (k: StepKey) => void
  p: NonNullable<ReturnType<typeof useProposal>['proposal']>
  update: ReturnType<typeof useProposal>['update']
  save: () => Promise<void> | undefined
  overflow: ReturnType<typeof useOverflowCollector>['overflow']
  makeReporter: ReturnType<typeof useOverflowCollector>['makeReporter']
}) {
  const pdf = usePdfExport()
  const [generated, setGenerated] = useState(false)
  const blocking = checks.filter((c) => !c.ok && c.blocking)
  const ready = blocking.length === 0
  const labels: Record<StepKey, string> = { client: 'Dados do cliente', scenario: 'Cenário atual', project: 'Projeto', investment: 'Investimentos', roi: 'ROI', cases: 'Cases', review: '' }
  const allChecks: { step: StepKey; ok: boolean; blocking: boolean; message?: string; skipped?: boolean }[] = (
    ['client', 'scenario', 'project', 'investment', 'roi', 'cases'] as StepKey[]
  ).map((k) => checks.find((c) => c.step === k) ?? { step: k, ok: true, blocking: false, skipped: true })

  return (
    <div className="mx-auto max-w-[1500px] animate-fade-up px-4 py-8 lg:px-6">
      <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className={cn('relative overflow-hidden rounded-2xl p-7', ready ? 'bg-ink text-white' : 'border bg-white')}>
            {ready && <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[22px] border-brand/20" />}
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', ready ? 'bg-brand' : 'bg-amber-100 text-amber-700')}>
              {ready ? <PartyPopper className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            </div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{ready ? 'Sua proposta está pronta!' : 'Quase lá'}</h2>
            <p className={cn('mt-1 text-sm', ready ? 'text-white/65' : 'text-muted-foreground')}>
              {ready ? `${deck.length} páginas em formato 16:9, prontas para enviar.` : 'Resolva os itens abaixo para gerar o PDF.'}
            </p>
            <ul className="mt-5 space-y-1">
              {allChecks.map((c) => (
                <li key={c.step}>
                  <button
                    onClick={() => go(c.step)}
                    className={cn('flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors', ready ? 'hover:bg-white/5' : 'hover:bg-mist')}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                        c.skipped ? 'bg-ink/10 text-ink/40' : c.ok ? 'bg-brand text-white' : c.blocking ? 'bg-red-500 text-white' : 'bg-amber-400 text-white',
                      )}
                    >
                      {c.skipped ? <Circle className="h-2 w-2" /> : c.ok ? <Check className="h-3 w-3" strokeWidth={3.5} /> : <span className="text-[11px] font-bold">!</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {labels[c.step]}
                        {c.skipped && <span className="font-normal opacity-60"> · página oculta</span>}
                      </span>
                      {c.message && <span className={cn('block text-xs', ready ? 'text-white/55' : 'text-muted-foreground')}>{c.message}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="mt-6 w-full"
              disabled={!ready || pdf.busy}
              onClick={async () => {
                await save()
                const blob = await pdf.generate(p)
                if (blob) setGenerated(true)
              }}
            >
              {pdf.busy ? (
                <>
                  <Loader2 className="animate-spin" /> Gerando {pdf.progress?.done}/{pdf.progress?.total}
                </>
              ) : (
                <>
                  <FileDown /> {generated ? 'Gerar PDF novamente' : 'Gerar PDF'}
                </>
              )}
            </Button>
            {pdf.busy && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-brand transition-all" style={{ width: `${((pdf.progress?.done ?? 0) / (pdf.progress?.total || 1)) * 100}%` }} />
              </div>
            )}
          </div>

          <OverflowWarnings items={overflow} />

          <div className="rounded-xl border bg-white p-5 shadow-soft">
            <div className="text-sm font-bold text-ink">Status da proposta</div>
            <Select value={p.status} onValueChange={(v) => update((d) => void (d.status = v as ProposalStatus))}>
              <SelectTrigger className="mt-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as ProposalStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-5">
            <ClosingForm p={p} update={update} />
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{deck.length} páginas</span>
            <Button asChild variant="outline" size="sm">
              <Link to={`/propostas/${p.id}/apresentar`}>
                <Eye /> Modo apresentação
              </Link>
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {deck.map((s, i) => (
              <div key={s.id}>
                <div className="overflow-hidden rounded-lg shadow-soft ring-1 ring-ink/5">
                  <OverflowScope report={makeReporter(s.id)}>
                    <SlideFrame>{s.element}</SlideFrame>
                  </OverflowScope>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="font-bold tabular-nums text-brand">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-semibold text-ink">{s.label}</span>
                  {overflow.some((o) => o.slideId === s.id) && <AlertCircle className="h-4 w-4 text-amber-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

