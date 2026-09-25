import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClientForm, ClosingForm, CoverForm, ProposalMetaForm } from '@/components/forms/client-forms'
import { BureauForm, CasesForm, ProjectForm, RoiForm, ScenarioForm } from '@/components/forms/content-forms'
import { InvestmentForm } from '@/components/forms/investment-form'
import { OverflowWarnings, ProposalTopBar } from '@/components/proposal-chrome'
import { OverflowScope, SlideFit, SlideFrame, useOverflowCollector } from '@/components/slides/frame'
import { buildDeck } from '@/components/slides/slides'
import { useProposal } from '@/hooks/use-proposal'
import { useAppData } from '@/lib/app-data'
import { SLIDES } from '@/lib/templates'
import type { SlideKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Loading, NotFound } from '@/components/status-pages'

export default function Editor() {
  const { id } = useParams()
  const { proposal: p, update, save, saveState, notFound } = useProposal(id)
  const data = useAppData()
  const [section, setSection] = useState<SlideKey>('cover')
  const [slideId, setSlideId] = useState<string | null>(null)
  const { overflow, makeReporter } = useOverflowCollector()
  const deck = useMemo(() => (p ? buildDeck(p, data) : []), [p, data])

  if (notFound) return <NotFound />
  if (!p) return <Loading />

  const inSection = deck.filter((s) => s.key === section)
  const current = inSection.find((s) => s.id === slideId) ?? inSection[0]
  const pageNo = current ? deck.indexOf(current) + 1 : 0
  const props = { p, update }
  const select = (k: SlideKey, sid?: string) => {
    setSection(k)
    setSlideId(sid ?? null)
  }
  const step = (dir: 1 | -1) => {
    if (!current) return
    const next = deck[deck.indexOf(current) + dir]
    if (next) select(next.key, next.id)
  }

  return (
    <div className="flex h-screen flex-col">
      <ProposalTopBar p={p} saveState={saveState} onSave={save} mode="editor" />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Navegação de páginas */}
        <nav className="scrollbar-thin flex shrink-0 gap-2 overflow-x-auto border-b bg-white p-3 lg:w-[230px] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {SLIDES.map((s, i) => {
            const slides = deck.filter((d) => d.key === s.key)
            const active = section === s.key
            const hidden = !p.sections[s.key]
            return (
              <div key={s.key} className="shrink-0 lg:shrink">
                <button
                  onClick={() => select(s.key)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors',
                    active ? 'bg-ink text-white' : 'hover:bg-mist',
                  )}
                >
                  <span className={cn('text-xs font-bold tabular-nums', active ? 'text-brand' : 'text-muted-foreground')}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="whitespace-nowrap text-sm font-semibold">{s.label}</span>
                  {hidden && <EyeOff className={cn('ml-auto h-3.5 w-3.5', active ? 'text-white/60' : 'text-muted-foreground')} />}
                </button>
                {slides[0] && (
                  <div className="mt-1.5 hidden space-y-1.5 px-1 lg:block">
                    {(active ? slides : slides.slice(0, 1)).map((sl) => (
                      <button
                        key={sl.id}
                        onClick={() => select(s.key, sl.id)}
                        className={cn(
                          'block w-full overflow-hidden rounded-md ring-1 ring-ink/10 transition-all',
                          current?.id === sl.id ? 'ring-2 ring-brand' : 'opacity-80 hover:opacity-100',
                        )}
                        title={sl.label}
                      >
                        <SlideFrame rounded={false}>{sl.element}</SlideFrame>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Preview */}
        <section className="flex min-h-[300px] min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_1px_1px,rgb(16_24_40/0.08)_1px,transparent_0)] [background-size:18px_18px] lg:min-h-0">
          <div className="flex items-center justify-between px-5 pt-4">
            <div className="text-sm font-semibold text-ink">
              {current ? (
                <>
                  <span className="tabular-nums text-brand">{String(pageNo).padStart(2, '0')}</span> · {current.label}
                </>
              ) : (
                SLIDES.find((s) => s.key === section)?.label
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" aria-label="Página anterior" disabled={!current || pageNo <= 1} onClick={() => step(-1)}>
                <ChevronLeft />
              </Button>
              <span className="w-14 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                {pageNo || '–'} / {deck.length}
              </span>
              <Button variant="outline" size="icon" aria-label="Próxima página" disabled={!current || pageNo >= deck.length} onClick={() => step(1)}>
                <ChevronRight />
              </Button>
            </div>
          </div>
          <OverflowWarnings items={overflow.filter((o) => o.slideId === current?.id)} className="mx-5 mt-3" />
          {current ? (
            <OverflowScope report={makeReporter(current.id)}>
              <SlideFit className="min-h-0 flex-1 p-5 max-lg:aspect-video">{current.element}</SlideFit>
            </OverflowScope>
          ) : (
            <div className="m-5 flex flex-1 items-center justify-center rounded-lg border border-dashed bg-white/70 p-6 text-center text-sm text-muted-foreground">
              {!p.sections[section] ? 'Esta página está oculta. Ative-a no painel ao lado para incluí-la no PDF.' : 'Selecione pelo menos um case no painel ao lado.'}
            </div>
          )}
        </section>

        {/* Painel de edição */}
        <aside className="scrollbar-thin shrink-0 space-y-4 overflow-y-auto border-t bg-mist p-4 lg:w-[460px] lg:border-l lg:border-t-0 xl:w-[540px]">
          {section === 'cover' && (
            <>
              <CoverForm {...props} />
              <ProposalMetaForm {...props} />
              <ClientForm {...props} />
            </>
          )}
          {section === 'scenario' && <ScenarioForm {...props} />}
          {section === 'project' && <ProjectForm {...props} />}
          {section === 'bureau' && <BureauForm {...props} />}
          {section === 'investment' && <InvestmentForm {...props} />}
          {section === 'roi' && <RoiForm {...props} />}
          {section === 'cases' && <CasesForm {...props} />}
          {section === 'closing' && (
            <>
              <ClosingForm {...props} />
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
