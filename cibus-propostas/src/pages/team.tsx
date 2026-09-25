import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PersonChip, personName, useMe, usePeople } from '@/hooks/use-people'
import { useAppData } from '@/lib/app-data'
import { calcInvestment, formatBRL } from '@/lib/pricing'
import { profileOf, unitCount } from '@/lib/products'
import { repo } from '@/lib/repo'
import { normalizeProposal } from '@/lib/templates'
import { STATUS_LABEL, type PersonRef, type Proposal, type ProposalStatus } from '@/lib/types'
import { cn, formatDateBR, relativeTime } from '@/lib/utils'
import { StatusBadge } from './dashboard'

const UNKNOWN = '__sem_autor__'
const personKey = (p: Proposal) => p.createdBy?.id || (p.createdBy?.name ? `nome:${p.createdBy.name}` : UNKNOWN)

export default function Team() {
  const nav = useNavigate()
  const { settings, modules, ready } = useAppData()
  const [list, setList] = useState<Proposal[] | null>(null)
  const me = useMe()
  const people = usePeople(list)
  const [who, setWho] = useState('all')
  const [product, setProduct] = useState('all')
  const [status, setStatus] = useState<ProposalStatus | 'all'>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!ready) return
    repo
      .listProposals()
      .then((ps) =>
        setList(ps.map((p) => normalizeProposal(p, { settings, modules, executive: null })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
      )
      .catch((e) => {
        toast.error(`Erro ao carregar propostas: ${e.message}`)
        setList([])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const mrr = (p: Proposal) => calcInvestment(p.investment).monthlyNetwork.final

  // resumo por pessoa
  const byPerson = useMemo(() => {
    const map = new Map<string, { key: string; ref: PersonRef | undefined; items: Proposal[] }>()
    for (const p of list ?? []) {
      const k = personKey(p)
      const entry = map.get(k) ?? { key: k, ref: p.createdBy, items: [] }
      entry.items.push(p)
      map.set(k, entry)
    }
    return [...map.values()]
      .map((e) => ({
        ...e,
        open: e.items.filter((p) => ['draft', 'review', 'sent'].includes(p.status)),
        approved: e.items.filter((p) => p.status === 'approved'),
        last: e.items[0]!.updatedAt,
      }))
      .sort((a, b) => b.items.length - a.items.length)
  }, [list])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (list ?? []).filter(
      (p) =>
        (who === 'all' || personKey(p) === who) &&
        (product === 'all' || p.meta.product === product) &&
        (status === 'all' || p.status === status) &&
        (!term || [p.client.company, p.client.contactName, p.meta.executive.name].some((s) => s?.toLowerCase().includes(term))),
    )
  }, [list, who, product, status, q])

  const products = [...new Set((list ?? []).map((p) => p.meta.product).filter(Boolean))]
  const nameOf = (e: (typeof byPerson)[number]) => (e.key === UNKNOWN ? 'Sem autor registrado' : personName(e.ref, people))

  return (
    <main className="container animate-fade-up py-10">
      <h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-ink">Painel da equipe</h1>
      <p className="mt-1 text-muted-foreground">Todas as propostas criadas e quem criou cada uma.</p>

      {repo.mode === 'local' && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Neste modo as propostas ficam salvas só neste navegador, então o painel mostra apenas as suas. Para ver as da equipe, use o link compartilhado ou
          configure o Supabase.
        </div>
      )}

      {list === null ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          {/* Por pessoa */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {byPerson.map((e) => (
              <button
                key={e.key}
                onClick={() => setWho(who === e.key ? 'all' : e.key)}
                className={cn(
                  'rounded-xl border bg-white p-5 text-left shadow-soft transition-all hover:border-ink/25',
                  who === e.key && 'border-brand ring-1 ring-brand',
                )}
              >
                <PersonChip
                  person={e.key === UNKNOWN ? undefined : e.ref}
                  people={people}
                  isMe={!!me?.id && e.ref?.id === me.id}
                  fallback={nameOf(e)}
                  className="text-sm font-bold text-ink"
                />
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-3xl font-extrabold tracking-tight text-ink">{e.items.length}</div>
                    <div className="text-xs text-muted-foreground">{e.items.length === 1 ? 'proposta' : 'propostas'}</div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>
                      <span className="font-bold text-ink">{formatBRL(e.open.reduce((s, p) => s + mrr(p), 0))}</span> em negociação
                    </div>
                    <div>
                      <span className="font-bold text-emerald-700">{formatBRL(e.approved.reduce((s, p) => s + mrr(p), 0))}</span> aprovadas
                    </div>
                    <div className="mt-1">última atividade {relativeTime(e.last)}</div>
                  </div>
                </div>
              </button>
            ))}
            {byPerson.length === 0 && <div className="rounded-xl border border-dashed bg-white p-8 text-center text-muted-foreground sm:col-span-2 xl:col-span-4">Nenhuma proposta ainda.</div>}
          </div>

          {/* Filtros */}
          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar cliente ou empresa" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger className="lg:w-56" aria-label="Criada por">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pessoas</SelectItem>
                {byPerson.map((e) => (
                  <SelectItem key={e.key} value={e.key}>
                    {nameOf(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger className="lg:w-48" aria-label="Produto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map((pr) => (
                  <SelectItem key={pr} value={pr}>
                    {pr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as ProposalStatus | 'all')}>
              <SelectTrigger className="lg:w-44" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.keys(STATUS_LABEL) as ProposalStatus[]).map((st) => (
                  <SelectItem key={st} value={st}>
                    {STATUS_LABEL[st]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground lg:ml-auto">
              {filtered.length} {filtered.length === 1 ? 'proposta' : 'propostas'}
            </span>
          </div>

          {/* Todas as propostas */}
          <div className="mt-4 overflow-x-auto rounded-xl border bg-white shadow-soft">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b bg-mist/70 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-3">Cliente / Empresa</th>
                  <th className="px-3 py-3">Produto</th>
                  <th className="px-3 py-3">Criada por</th>
                  <th className="px-3 py-3">Última alteração</th>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3 text-right">Valor mensal</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const calc = calcInvestment(p.investment)
                  return (
                    <tr key={p.id} className="cursor-pointer border-b last:border-0 hover:bg-mist/60" onClick={() => nav(`/propostas/${p.id}`)}>
                      <td className="px-5 py-3">
                        <div className="font-bold text-ink">{p.client.company || 'Sem empresa'}</div>
                        <div className="text-xs text-muted-foreground">{p.client.contactName || '—'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-semibold',
                            profileOf(p.meta.product).key === 'partner' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700',
                          )}
                        >
                          {p.meta.product}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <PersonChip person={p.createdBy} people={people} isMe={!!me?.id && p.createdBy?.id === me.id} fallback="Sem autor registrado" />
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <div>{relativeTime(p.updatedAt)}</div>
                        {p.updatedBy && <div className="text-xs">por {personName(p.updatedBy, people)}</div>}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">{formatDateBR(p.meta.date)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-bold tabular-nums text-ink">{formatBRL(calc.monthlyNetwork.final)}</div>
                        <div className="text-xs text-muted-foreground">{unitCount(calc.stations, p.meta.product)}</div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                      Nenhuma proposta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
