import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Copy,
  Eye,
  FileDown,
  FileText,
  Loader2,
  MoreHorizontal,
  PanelsTopLeft,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SlideFrame } from '@/components/slides/frame'
import { CoverSlide, ThemedSlide } from '@/components/slides/slides'
import { usePdfExport } from '@/hooks/use-pdf'
import { useAppData } from '@/lib/app-data'
import { calcInvestment, formatBRL } from '@/lib/pricing'
import { PRODUCT_PROFILES, productSettings, profileOf, unitCount, type ProductKey } from '@/lib/products'
import { repo } from '@/lib/repo'
import { TEMPLATES, duplicateProposal, normalizeProposal } from '@/lib/templates'
import { STATUS_LABEL, type Proposal, type ProposalStatus } from '@/lib/types'
import { cn, formatDateBR, relativeTime } from '@/lib/utils'

const STATUS_VARIANT: Record<ProposalStatus, 'muted' | 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'muted',
  review: 'warning',
  sent: 'info',
  approved: 'success',
  lost: 'danger',
}

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
  const data = useAppData()
  const { settings, modules, executives, ready } = data
  const [list, setList] = useState<Proposal[] | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ProposalStatus | 'all'>('all')
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<Proposal | null>(null)
  const pdf = usePdfExport()
  const [pdfId, setPdfId] = useState<string | null>(null)

  const load = () =>
    repo
      .listProposals()
      .then((ps) =>
        setList(
          ps
            .map((p) => normalizeProposal(p, { settings, modules, executive: null }))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        ),
      )
      .catch((e) => {
        toast.error(`Erro ao carregar propostas: ${e.message}`)
        setList([])
      })

  useEffect(() => {
    if (ready) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (list ?? []).filter(
      (p) =>
        (status === 'all' || p.status === status) &&
        (!term || [p.client.contactName, p.client.company, p.meta.executive.name, p.meta.title].some((s) => s?.toLowerCase().includes(term))),
    )
  }, [list, q, status])

  const stats = useMemo(() => {
    const ps = list ?? []
    const open = ps.filter((p) => ['draft', 'review', 'sent'].includes(p.status))
    const mrr = (arr: Proposal[]) => arr.reduce((s, p) => s + calcInvestment(p.investment).monthlyNetwork.final, 0)
    return {
      total: ps.length,
      openCount: open.length,
      openValue: mrr(open),
      approvedValue: mrr(ps.filter((p) => p.status === 'approved')),
      approvedCount: ps.filter((p) => p.status === 'approved').length,
    }
  }, [list])

  const createFrom = async (templateId: string, product: ProductKey) => {
    const t = TEMPLATES.find((x) => x.id === templateId)!
    const exec = executives.find((e) => e.active) ?? null
    const p = t.build({ settings, modules, executive: exec, product })
    await repo.saveProposal(p)
    nav(`/propostas/${p.id}`)
  }

  const duplicate = async (p: Proposal, open = true) => {
    const copy = duplicateProposal(p)
    await repo.saveProposal(copy)
    toast.success('Proposta duplicada', { description: 'Atualize cliente, data e valores.' })
    if (open) nav(`/propostas/${copy.id}?step=client`)
    else load()
  }

  const setStatusOf = async (p: Proposal, s: ProposalStatus) => {
    await repo.saveProposal({ ...p, status: s, updatedAt: new Date().toISOString() })
    load()
  }

  return (
    <main className="container animate-fade-up py-10">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-ink">Minhas propostas</h1>
          <p className="mt-1 text-base text-muted-foreground">Crie propostas comerciais personalizadas para seus clientes.</p>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}>
          <Plus className="!size-5" /> Nova proposta
        </Button>
      </div>

      {/* Indicadores */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-soft">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Propostas</div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{stats.total}</div>
          <div className="text-sm text-muted-foreground">{stats.openCount} em andamento</div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-soft">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Em negociação</div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{formatBRL(stats.openValue)}</div>
          <div className="text-sm text-muted-foreground">em mensalidades</div>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-ink p-5 text-white shadow-soft">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[14px] border-brand/20" />
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">Aprovadas</div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-brand">{formatBRL(stats.approvedValue)}</div>
          <div className="text-sm text-white/60">
            {stats.approvedCount} {stats.approvedCount === 1 ? 'proposta' : 'propostas'} · mensal
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'draft', 'review', 'sent', 'approved', 'lost'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'h-8 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
                status === s ? 'border-ink bg-ink text-white' : 'bg-white text-ink/70 hover:text-ink',
              )}
            >
              {s === 'all' ? 'Todas' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente, empresa ou executivo" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {/* Lista */}
      <div className="mt-4">
        {list === null ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-10 text-center text-muted-foreground">Nenhuma proposta encontrada.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_110px_150px_120px_110px_44px] gap-4 border-b bg-mist/70 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:grid">
              <span>Cliente / Empresa</span>
              <span>Executivo</span>
              <span>Data</span>
              <span>Valor mensal</span>
              <span>Status</span>
              <span>Atualizada</span>
              <span />
            </div>
            {filtered.map((p) => {
              const calc = calcInvestment(p.investment)
              return (
                <div
                  key={p.id}
                  className="group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b px-5 py-4 transition-colors last:border-0 hover:bg-mist/60 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_110px_150px_120px_110px_44px]"
                  onClick={() => nav(`/propostas/${p.id}`)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden w-[92px] shrink-0 overflow-hidden rounded-md border sm:block">
                      <SlideFrame rounded={false}>
                        <ThemedSlide p={p} ctx={data}>
                          <CoverSlide p={p} ctx={data} page={1} total={1} index={0} />
                        </ThemedSlide>
                      </SlideFrame>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-ink">{p.client.company || 'Sem empresa'}</div>
                      <div className="truncate text-sm text-muted-foreground">
                        {p.client.contactName || 'Cliente não informado'} · {p.meta.product}
                      </div>
                    </div>
                  </div>
                  <div className="col-start-2 row-start-1 flex items-center gap-2 lg:hidden">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="truncate text-sm text-ink/80 max-lg:hidden">{p.meta.executive.name || '—'}</div>
                  <div className="text-sm tabular-nums text-ink/80 max-lg:hidden">{formatDateBR(p.meta.date)}</div>
                  <div className="max-lg:col-span-2 max-lg:flex max-lg:gap-3 max-lg:text-sm">
                    <span className="font-bold tabular-nums text-ink">{formatBRL(calc.monthlyNetwork.final)}</span>
                    <span className="block text-xs text-muted-foreground max-lg:inline">
                      {calc.stations > 1 ? unitCount(calc.stations, p.meta.product) : 'por mês'}
                    </span>
                    <span className="text-xs text-muted-foreground lg:hidden">· {p.meta.executive.name} · {relativeTime(p.updatedAt)}</span>
                  </div>
                  <div className="max-lg:hidden">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-sm text-muted-foreground max-lg:hidden">{relativeTime(p.updatedAt)}</div>
                  <div onClick={(e) => e.stopPropagation()} className="max-lg:absolute max-lg:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ações">
                          {pdf.busy && pdfId === p.id ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                        </Button>
                      </DropdownMenuTrigger>
                      <ProposalActions
                        p={p}
                        onEdit={() => nav(`/propostas/${p.id}`)}
                        onEditor={() => nav(`/propostas/${p.id}/editor`)}
                        onView={() => nav(`/propostas/${p.id}/apresentar`)}
                        onDuplicate={() => duplicate(p)}
                        onPdf={async () => {
                          setPdfId(p.id)
                          await pdf.generate(p)
                          setPdfId(null)
                        }}
                        onStatus={(s) => setStatusOf(p, s)}
                        onDelete={() => setToDelete(p)}
                      />
                    </DropdownMenu>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-2 lg:hidden" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => nav(`/propostas/${p.id}`)}>
                      <Pencil /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate(p)}>
                      <Copy /> Duplicar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => nav(`/propostas/${p.id}/apresentar`)}>
                      <Eye /> Visualizar
                    </Button>
                    <Button size="sm" variant="outline" disabled={pdf.busy} onClick={() => pdf.generate(p)}>
                      <FileDown /> PDF
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <NewProposalDialog
        open={creating}
        onOpenChange={setCreating}
        proposals={list ?? []}
        onTemplate={createFrom}
        onDuplicate={(p) => duplicate(p)}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir proposta?"
        description={`A proposta de ${toDelete?.client.company || 'cliente sem nome'} será excluída permanentemente.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await repo.deleteProposal(toDelete.id)
          toast.success('Proposta excluída')
          setToDelete(null)
          load()
        }}
      />
    </main>
  )
}

function ProposalActions(props: {
  p: Proposal
  onEdit: () => void
  onEditor: () => void
  onView: () => void
  onDuplicate: () => void
  onPdf: () => void
  onStatus: (s: ProposalStatus) => void
  onDelete: () => void
}) {
  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onSelect={props.onEdit}>
        <Pencil /> Editar
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={props.onEditor}>
        <PanelsTopLeft /> Editor visual
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={props.onView}>
        <Eye /> Visualizar
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={props.onDuplicate}>
        <Copy /> Duplicar
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={props.onPdf}>
        <FileDown /> Gerar PDF
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Status</DropdownMenuLabel>
      {(Object.keys(STATUS_LABEL) as ProposalStatus[]).map((s) => (
        <DropdownMenuItem key={s} onSelect={() => props.onStatus(s)} className={cn(props.p.status === s && 'bg-mist')}>
          <span className={cn('ml-1 mr-1 h-2 w-2 rounded-full', props.p.status === s ? 'bg-brand' : 'bg-border')} />
          {STATUS_LABEL[s]}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem destructive onSelect={props.onDelete}>
        <Trash2 /> Excluir
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink px-8 py-14 text-center text-white">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[36px] border-brand/15" />
      <div className="absolute -bottom-24 -left-10 h-60 w-60 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative mx-auto max-w-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand">
          <FileText className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight">Sua primeira proposta em poucos minutos</h2>
        <p className="mt-3 text-white/70">
          Preencha os dados do cliente, escolha módulos e valores, selecione cases — o Cibus Propostas cuida do design e gera um PDF pronto para enviar.
        </p>
        <Button size="lg" className="mt-8" onClick={onCreate}>
          <Plus className="!size-5" /> Nova proposta
        </Button>
      </div>
    </div>
  )
}

function NewProposalDialog({
  open,
  onOpenChange,
  proposals,
  onTemplate,
  onDuplicate,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  proposals: Proposal[]
  onTemplate: (id: string, product: ProductKey) => Promise<void>
  onDuplicate: (p: Proposal) => void
}) {
  const data = useAppData()
  const [busy, setBusy] = useState<ProductKey | null>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova proposta</DialogTitle>
          <DialogDescription>Escolha o produto: cores, capa e textos da proposta seguem o produto. Ou reaproveite uma proposta anterior.</DialogDescription>
        </DialogHeader>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Escolha o produto</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(PRODUCT_PROFILES) as ProductKey[]).map((key) => {
            const profile = PRODUCT_PROFILES[key]
            const color = productSettings(data.settings, key).brandColor
            const sample = TEMPLATES[0]!.build({ settings: data.settings, modules: data.modules, executive: null, product: key })
            return (
              <button
                key={key}
                disabled={busy !== null}
                onClick={async () => {
                  setBusy(key)
                  try {
                    await onTemplate(TEMPLATES[0]!.id, key)
                  } finally {
                    setBusy(null)
                  }
                }}
                style={{ borderColor: `${color}55` }}
                className="group overflow-hidden rounded-xl border-2 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-lift"
                aria-label={`Nova proposta ${profile.name}`}
              >
                <div className="pointer-events-none border-b">
                  <SlideFrame rounded={false}>
                    <ThemedSlide p={sample} ctx={data}>
                      <CoverSlide p={{ ...sample, client: { ...sample.client, company: 'Seu cliente' } }} ctx={data} page={1} total={1} index={0} />
                    </ThemedSlide>
                  </SlideFrame>
                </div>
                <div className="flex items-center gap-3 p-4">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink">{profile.name}</div>
                    <div className="text-xs text-muted-foreground">{profile.description}</div>
                  </div>
                  {busy === key ? (
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color }} />
                  ) : (
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" style={{ color }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
        {proposals.length > 0 && (
          <div>
            <div className="mb-2 mt-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Usar proposta anterior como template</div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {proposals.slice(0, 20).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onOpenChange(false)
                    onDuplicate(p)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-left hover:border-ink/25 hover:bg-mist/60"
                >
                  <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{p.client.company || 'Sem empresa'}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.meta.product} · {formatBRL(calcInvestment(p.investment).monthly.final)}/{profileOf(p.meta.product).unit.one} · {formatDateBR(p.meta.date)}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
