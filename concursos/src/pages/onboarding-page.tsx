import {
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  FileText,
  Landmark,
  MapPin,
  Plus,
  Search,
  SearchX,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Logo } from '@/components/layout/logo'
import { DemoNotice, EmptyState, ErrorState } from '@/components/study/feedback'
import { IconTile } from '@/components/study/icon-registry'
import { SourceChips } from '@/components/study/sources'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCareers, useCreateCustomPosition, usePlan, usePositions, useSelection, useSetSelection, useUserTopics } from '@/data/queries'
import type { PositionListItem } from '@/data/sources'
import { positionTitle } from '@/domain/labels'
import { planProgress, toStatusMap } from '@/domain/progress'
import type { Career, Sphere } from '@/domain/types'
import { BRAZIL_STATES, POPULAR_UFS, SPHERE_LABEL, stateName } from '@/lib/states'
import { normalize, percent, pluralize } from '@/lib/text'
import { cn } from '@/lib/utils'

type Step = 'career' | 'sphere' | 'position' | 'custom' | 'ready'

const SPHERES: { id: Sphere; icon: LucideIcon; description: string }[] = [
  { id: 'federal', icon: Landmark, description: 'Órgãos da União: tribunais federais, Receita, PF, agências…' },
  { id: 'estadual', icon: Building, description: 'Secretarias, tribunais e polícias do seu estado.' },
  { id: 'municipal', icon: MapPin, description: 'Prefeituras e câmaras municipais.' },
]

const STEP_NUMBER: Record<Step, number> = { career: 1, sphere: 2, position: 3, custom: 3, ready: 4 }

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('career')
  const [career, setCareer] = useState<Career | null>(null)
  const [sphere, setSphere] = useState<Sphere | null>(null)
  const [uf, setUf] = useState<string | null>(null)
  const [positionId, setPositionId] = useState<string | null>(null)
  const existing = useSelection()
  const setSelection = useSetSelection()

  const back = () => {
    if (step === 'sphere') setStep('career')
    else if (step === 'position') setStep('sphere')
    else if (step === 'custom') setStep(career ? 'position' : 'career')
    else if (step === 'ready') setStep(career?.isCustom || !career ? 'custom' : 'position')
  }

  const start = () => {
    if (!positionId || !sphere) return
    setSelection.mutate(
      { positionId, sphere, state: sphere === 'federal' ? null : uf },
      {
        onSuccess: () => navigate('/dashboard'),
        onError: () => toast.error('Não foi possível salvar sua escolha.'),
      },
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-4 sm:px-6">
          {step === 'career' ? (
            <Link to={existing.data ? '/dashboard' : '/'} aria-label="Voltar">
              <Logo />
            </Link>
          ) : (
            <Button variant="ghost" size="sm" onClick={back} className="-ml-2">
              <ArrowLeft /> Voltar
            </Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-semibold text-muted">Etapa {STEP_NUMBER[step]} de 4</span>
            <div className="flex gap-1.5" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    n <= STEP_NUMBER[step] ? 'w-6 bg-primary' : 'w-3 bg-foreground/10',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 sm:pt-14">
        <div key={step} className="animate-fade-in">
          {step === 'career' && (
            <CareerStep
              onSelect={(c) => {
                setCareer(c)
                setStep('sphere')
              }}
              onCustom={() => {
                setCareer(null)
                setStep('custom')
              }}
            />
          )}
          {step === 'sphere' && career && (
            <SphereStep
              career={career}
              sphere={sphere}
              uf={uf}
              onChange={(s, u) => {
                setSphere(s)
                setUf(u)
              }}
              onNext={() => setStep('position')}
            />
          )}
          {step === 'position' && career && sphere && (
            <PositionStep
              career={career}
              sphere={sphere}
              uf={uf}
              onSelect={(id, s) => {
                setPositionId(id)
                if (s) setSphere(s)
                setStep('ready')
              }}
              onCustom={() => setStep('custom')}
            />
          )}
          {step === 'custom' && (
            <CustomStep
              career={career}
              initialSphere={sphere}
              initialUf={uf}
              onCreated={(id, s, u) => {
                setPositionId(id)
                setSphere(s)
                setUf(u)
                setStep('ready')
              }}
            />
          )}
          {step === 'ready' && positionId && sphere && (
            <ReadyStep positionId={positionId} sphere={sphere} uf={uf} onStart={start} starting={setSelection.isPending} />
          )}
        </div>
      </main>
    </div>
  )
}

function StepTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8 text-center sm:mb-10">
      <h1 className="text-[28px] font-extrabold tracking-tight text-balance sm:text-4xl">{title}</h1>
      {description && <p className="mx-auto mt-3 max-w-lg text-[15px] text-muted">{description}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ Etapa 1 */

function CareerStep({ onSelect, onCustom }: { onSelect: (career: Career) => void; onCustom: () => void }) {
  const careers = useCareers()
  const positions = usePositions({})
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of positions.data ?? []) map.set(p.career.id, (map.get(p.career.id) ?? 0) + 1)
    return map
  }, [positions.data])

  return (
    <>
      <StepTitle title="Qual carreira você deseja seguir?" description="Vamos montar seu plano de estudos a partir dos editais anteriores dessa área." />
      {careers.error ? (
        <ErrorState error={careers.error} onRetry={() => careers.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {careers.isLoading
            ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-[120px]" />)
            : careers.data?.map((career) => {
                const count = counts.get(career.id) ?? 0
                return (
                  <button
                    key={career.id}
                    type="button"
                    onClick={() => onSelect(career)}
                    className="group flex flex-col items-start rounded-2xl border border-border bg-surface p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lift sm:p-5"
                  >
                    <IconTile icon={career.icon} className="transition group-hover:bg-primary group-hover:text-white" />
                    <span className="mt-4 font-bold leading-tight">{career.name}</span>
                    <span className="mt-1 text-xs text-muted">{count > 0 ? pluralize(count, 'cargo', 'cargos') : 'Em breve'}</span>
                  </button>
                )
              })}
          {!careers.isLoading && (
            <button
              type="button"
              onClick={onCustom}
              className="flex flex-col items-start rounded-2xl border-2 border-dashed border-border-strong p-4 text-left transition hover:border-primary hover:bg-primary-tint/40 sm:p-5"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-foreground/[0.06] text-muted">
                <Plus className="size-5" aria-hidden />
              </span>
              <span className="mt-4 font-bold leading-tight">Outra carreira</span>
              <span className="mt-1 text-xs text-muted">Cadastrar manualmente</span>
            </button>
          )}
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ Etapa 2 */

function SphereStep({
  career,
  sphere,
  uf,
  onChange,
  onNext,
}: {
  career: Career
  sphere: Sphere | null
  uf: string | null
  onChange: (sphere: Sphere, uf: string | null) => void
  onNext: () => void
}) {
  const positions = usePositions({ careerId: career.id })
  const countFor = (s: Sphere) => positions.data?.filter((p) => p.position.spheres.includes(s)).length ?? 0
  const needsState = sphere === 'estadual' || sphere === 'municipal'
  const canContinue = sphere && (!needsState || uf)

  return (
    <>
      <StepTitle title="Onde você pretende prestar concurso?" description={`Carreira: ${career.name}`} />
      <div role="radiogroup" aria-label="Abrangência" className="grid gap-3 sm:grid-cols-3">
        {SPHERES.map(({ id, icon: Icon, description }) => {
          const active = sphere === id
          const count = countFor(id)
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(id, id === 'federal' ? null : uf)}
              className={cn(
                'relative flex items-start gap-4 rounded-2xl border bg-surface p-5 text-left shadow-soft transition-all duration-200 sm:flex-col',
                active ? 'border-primary ring-4 ring-ring/20' : 'border-border hover:border-primary/40 hover:shadow-lift',
              )}
            >
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-xl transition',
                  active ? 'bg-primary text-white' : 'bg-primary-tint text-primary dark:text-primary-soft',
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-lg font-bold">{SPHERE_LABEL[id]}</span>
                <span className="mt-1 block text-sm text-muted">{description}</span>
                <span className="mt-3 block text-xs font-semibold text-muted">
                  {positions.isLoading ? '…' : count > 0 ? pluralize(count, 'cargo disponível', 'cargos disponíveis') : 'Sem cargos cadastrados'}
                </span>
              </span>
              {active && (
                <span className="absolute right-4 top-4 grid size-6 place-items-center rounded-full bg-primary text-white animate-pop">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {needsState && (
        <Card className="mt-6 animate-fade-in p-5 sm:p-6">
          <Label htmlFor="uf">{sphere === 'municipal' ? 'Estado do município' : 'Estado'}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR_UFS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChange(sphere!, code)}
                aria-pressed={uf === code}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
                  uf === code ? 'border-primary bg-primary text-white' : 'border-border bg-surface hover:border-primary/50',
                )}
              >
                {stateName(code)}
              </button>
            ))}
          </div>
          <select
            id="uf"
            value={uf ?? ''}
            onChange={(e) => onChange(sphere!, e.target.value || null)}
            className="mt-4 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm shadow-soft outline-none focus:border-primary focus:ring-4 focus:ring-ring/25 sm:w-72"
          >
            <option value="">Todos os estados…</option>
            {BRAZIL_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.name}
              </option>
            ))}
          </select>
        </Card>
      )}

      <div className="mt-8 flex justify-end">
        <Button size="lg" disabled={!canContinue} onClick={onNext} className="w-full sm:w-auto">
          Continuar <ArrowRight />
        </Button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ Etapa 3 */

function PositionCard({ item, uf, onSelect }: { item: PositionListItem; uf: string | null; onSelect: () => void }) {
  const inState = uf ? item.contests.filter((c) => c.state === uf) : []
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lift sm:p-5"
    >
      <IconTile icon={item.career.icon} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{item.position.name}</span>
          {inState.length > 0 && (
            <span className="rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-semibold text-success-strong">
              Edital em {uf}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{item.position.description}</span>
        <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted">
          <FileText className="size-3.5" aria-hidden />
          {item.contests.length > 0 ? `Baseado em ${pluralize(item.contests.length, 'edital anterior', 'editais anteriores')}` : 'Sem editais cadastrados'}
        </span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
    </button>
  )
}

function PositionStep({
  career,
  sphere,
  uf,
  onSelect,
  onCustom,
}: {
  career: Career
  sphere: Sphere
  uf: string | null
  onSelect: (positionId: string, sphere?: Sphere) => void
  onCustom: () => void
}) {
  const [query, setQuery] = useState('')
  const positions = usePositions({ careerId: career.id, sphere })
  const all = usePositions({})

  const matches = (item: PositionListItem) => normalize(`${item.position.name} ${item.position.description}`).includes(normalize(query))
  const list = useMemo(() => {
    const items = (positions.data ?? []).filter(matches)
    // Cargos com edital no estado escolhido aparecem primeiro
    return items.sort((a, b) => Number(b.contests.some((c) => c.state === uf)) - Number(a.contests.some((c) => c.state === uf)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.data, query, uf])
  const elsewhere = useMemo(
    () => (query.trim().length >= 2 ? (all.data ?? []).filter((p) => matches(p) && !list.some((l) => l.position.id === p.position.id)).slice(0, 5) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all.data, list, query],
  )

  const where = sphere === 'federal' ? 'Federal' : `${SPHERE_LABEL[sphere]}${uf ? ` · ${stateName(uf)}` : ''}`

  return (
    <>
      <StepTitle title="Qual cargo?" description={`${career.name} · ${where}`} />
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar cargo…"
          aria-label="Pesquisar cargo"
          className="h-14 rounded-2xl pl-12 text-base"
          autoFocus
        />
      </div>

      {positions.error ? (
        <ErrorState error={positions.error} onRetry={() => positions.refetch()} />
      ) : positions.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      ) : list.length === 0 && elsewhere.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={query ? `Nenhum cargo encontrado para “${query}”` : 'Ainda não há cargos cadastrados aqui'}
          description="Você pode cadastrar o cargo manualmente e importar o conteúdo programático do edital depois."
          action={
            <Button variant="secondary" onClick={onCustom}>
              <Plus /> Cadastrar cargo manualmente
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <PositionCard key={item.position.id} item={item} uf={uf} onSelect={() => onSelect(item.position.id)} />
          ))}
          {elsewhere.length > 0 && (
            <>
              <p className="pt-4 text-xs font-bold uppercase tracking-wider text-subtle">Em outras carreiras ou esferas</p>
              {elsewhere.map((item) => (
                <PositionCard key={item.position.id} item={item} uf={uf} onSelect={() => onSelect(item.position.id, item.position.spheres.includes(sphere) ? sphere : item.position.spheres[0])} />
              ))}
            </>
          )}
          <button type="button" onClick={onCustom} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold text-muted transition hover:text-primary">
            <Plus className="size-4" aria-hidden /> Não encontrou? Cadastre seu cargo
          </button>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ Cadastro manual */

function CustomStep({
  career,
  initialSphere,
  initialUf,
  onCreated,
}: {
  career: Career | null
  initialSphere: Sphere | null
  initialUf: string | null
  onCreated: (positionId: string, sphere: Sphere, uf: string | null) => void
}) {
  const [careerName, setCareerName] = useState('')
  const [positionName, setPositionName] = useState('')
  const [sphere, setSphere] = useState<Sphere>(initialSphere ?? 'federal')
  const [uf, setUf] = useState<string | null>(initialUf)
  const create = useCreateCustomPosition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!positionName.trim() || (!career && !careerName.trim())) return
    create.mutate(
      { careerId: career?.id, careerName: careerName.trim(), positionName: positionName.trim(), spheres: [sphere] },
      {
        onSuccess: (position) => onCreated(position.id, sphere, sphere === 'federal' ? null : uf),
        onError: () => toast.error('Não foi possível cadastrar o cargo.'),
      },
    )
  }

  return (
    <>
      <StepTitle
        title={career ? 'Cadastrar cargo' : 'Outra carreira'}
        description="Cadastre seu cargo. Depois, importe o conteúdo programático do edital para gerar as disciplinas e os assuntos."
      />
      <Card className="mx-auto max-w-xl p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-5">
          {career ? (
            <p className="rounded-xl bg-foreground/[0.04] px-4 py-3 text-sm">
              Carreira: <strong>{career.name}</strong>
            </p>
          ) : (
            <div>
              <Label htmlFor="career-name">Nome da carreira</Label>
              <Input id="career-name" value={careerName} onChange={(e) => setCareerName(e.target.value)} placeholder="Ex.: Carreiras Ambientais" required />
            </div>
          )}
          <div>
            <Label htmlFor="position-name">Cargo</Label>
            <Input id="position-name" value={positionName} onChange={(e) => setPositionName(e.target.value)} placeholder="Ex.: Analista Ambiental" required />
          </div>
          <div>
            <Label>Abrangência</Label>
            <div className="grid grid-cols-3 gap-2">
              {SPHERES.map(({ id }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={sphere === id}
                  onClick={() => setSphere(id)}
                  className={cn(
                    'h-11 rounded-xl border text-sm font-semibold transition',
                    sphere === id ? 'border-primary bg-primary text-white' : 'border-border bg-surface hover:border-primary/50',
                  )}
                >
                  {SPHERE_LABEL[id]}
                </button>
              ))}
            </div>
          </div>
          {sphere !== 'federal' && (
            <div>
              <Label htmlFor="custom-uf">Estado</Label>
              <select
                id="custom-uf"
                value={uf ?? ''}
                onChange={(e) => setUf(e.target.value || null)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm shadow-soft outline-none focus:border-primary"
              >
                <option value="">Selecione…</option>
                {BRAZIL_STATES.map((s) => (
                  <option key={s.uf} value={s.uf}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button type="submit" size="lg" className="w-full" loading={create.isPending}>
            Criar meu plano <ArrowRight />
          </Button>
        </form>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ Etapa 4 */

function ReadyStep({ positionId, sphere, uf, onStart, starting }: { positionId: string; sphere: Sphere; uf: string | null; onStart: () => void; starting: boolean }) {
  const plan = usePlan(positionId)
  const userTopics = useUserTopics()

  if (plan.error) return <ErrorState error={plan.error} onRetry={() => plan.refetch()} />
  if (plan.isLoading || !plan.data)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
        <Skeleton className="mx-auto h-10 w-80" />
        <Skeleton className="h-64" />
      </div>
    )

  const p = plan.data
  const topicCount = p.subjects.reduce((n, s) => n + s.topics.length, 0)
  const empty = p.subjects.length === 0

  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-strong text-white shadow-[0_12px_30px_-10px_rgb(124_58_237/0.7)] animate-pop">
        <Sparkles className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 text-[28px] font-extrabold tracking-tight sm:text-4xl">{empty ? 'Seu cargo foi criado.' : 'Seu plano de estudos está pronto.'}</h1>
      <p className="mt-3 text-lg font-semibold text-primary dark:text-primary-soft">{positionTitle(p, { sphere, state: uf })}</p>

      <Card className="mt-8 p-6 text-left sm:p-8">
        <dl className="grid grid-cols-3 divide-x divide-border text-center">
          {[
            { label: 'disciplinas', value: p.subjects.length },
            { label: 'assuntos', value: topicCount },
            { label: 'concluído', value: percent(planProgress(p, toStatusMap(userTopics.data ?? [])).ratio) },
          ].map(({ label, value }) => (
            <div key={label} className="px-2">
              <dd className="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">{value}</dd>
              <dt className="mt-1 text-sm text-muted">{label}</dt>
            </div>
          ))}
        </dl>

        {empty ? (
          <p className="mt-6 rounded-xl bg-foreground/[0.04] p-4 text-sm text-muted">
            Ainda não há editais cadastrados para este cargo. No painel, use <strong className="text-foreground">Meu concurso → Importar edital</strong> para
            colar o conteúdo programático e gerar suas disciplinas automaticamente.
          </p>
        ) : (
          <>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-subtle">Consolidado a partir de</p>
              <SourceChips contests={p.contests} className="mt-2" max={6} />
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {p.subjects.map((s) => (
                <span key={s.subject.id} className="rounded-full bg-primary-tint px-2.5 py-1 text-xs font-semibold text-primary-strong dark:text-primary-soft">
                  {s.subject.name}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {p.hasDemoData && <DemoNotice className="mt-4 text-left" />}

      <Button size="lg" className="mt-8 h-14 w-full px-8 text-base sm:w-auto" onClick={onStart} loading={starting}>
        Começar a estudar <ArrowRight className="!size-5" />
      </Button>
    </div>
  )
}
