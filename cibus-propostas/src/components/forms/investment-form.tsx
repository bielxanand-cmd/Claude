import { useState } from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppData } from '@/lib/app-data'
import { calcInvestment, discountAmount, discountForFinal, formatBRL, formatPercent, type InvestmentCalc } from '@/lib/pricing'
import { itemFromModule, libraryItems, uid } from '@/lib/templates'
import { MODULE_CATEGORIES, type Discount } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SectionToggle, type FormProps } from './client-forms'
import { Field, MoneyInput, NumberInput, Section } from './fields'

const QUICK_STATIONS = [1, 2, 5, 10, 15]

function DiscountInput({ value, onChange, base, id }: { value: Discount; onChange: (d: Discount) => void; base: number; id?: string }) {
  return (
    <div className="flex gap-2">
      <div className="flex shrink-0 rounded-md border border-input bg-mist p-0.5">
        {(['percent', 'fixed'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              if (t === value.type) return
              // converte o valor atual para o outro tipo, mantendo o desconto
              const amount = discountAmount(base, value)
              onChange({ type: t, value: t === 'percent' ? (base > 0 ? Math.round((amount / base) * 10000) / 100 : 0) : amount })
            }}
            className={cn('h-8 w-10 rounded text-sm font-bold', value.type === t ? 'bg-white text-ink shadow-sm' : 'text-muted-foreground')}
          >
            {t === 'percent' ? '%' : 'R$'}
          </button>
        ))}
      </div>
      <MoneyInput
        id={id}
        className="flex-1"
        value={value.value}
        prefix={value.type === 'fixed' ? 'R$' : ''}
        suffix={value.type === 'percent' ? '%' : undefined}
        onChange={(n) => onChange({ ...value, value: n })}
      />
    </div>
  )
}

function Line({ label, value, strong, accent, muted }: { label: string; value: string; strong?: boolean; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={cn('text-sm', muted ? 'text-muted-foreground' : 'text-ink/80')}>{label}</span>
      <span className={cn('whitespace-nowrap tabular-nums', strong ? 'text-lg font-extrabold' : 'text-sm font-semibold', accent ? 'text-brand' : 'text-ink')}>{value}</span>
    </div>
  )
}

export function FinancialSummary({ calc, className }: { calc: InvestmentCalc; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-ink text-white shadow-lift', className)}>
      <div className="p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">Resumo financeiro</div>
        <div className="mt-3 flex items-end gap-1.5">
          <span className="text-4xl font-extrabold tracking-tight text-brand">{formatBRL(calc.monthly.final)}</span>
        </div>
        <div className="text-sm text-white/70">/mês por posto</div>
        {calc.stations > 1 && (
          <div className="mt-1 text-sm font-semibold text-white">
            {formatBRL(calc.monthlyNetwork.final)}/mês <span className="font-normal text-white/60">· rede com {calc.stations} postos</span>
          </div>
        )}
      </div>
      <div className="space-y-0.5 border-t border-white/10 bg-white/[0.03] p-5">
        {[
          ['Valor de tabela (mensal)', formatBRL(calc.monthlyNetwork.table)],
          ['Desconto (mensal)', `- ${formatBRL(calc.monthlyNetwork.discount)}`],
          ['Valor final (mensal)', formatBRL(calc.monthlyNetwork.final)],
          ['Implantação', calc.implementation.free ? 'Isenta' : formatBRL(calc.implementation.final)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between py-1 text-sm">
            <span className="text-white/60">{k}</span>
            <span className="font-semibold tabular-nums">{v}</span>
          </div>
        ))}
        {calc.summary.savings > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-brand/15 px-3 py-2.5">
          <span className="text-sm font-semibold text-white">Economia gerada</span>
          <span className="text-right">
            <span className="block font-extrabold tabular-nums text-brand">{formatBRL(calc.summary.savings)}</span>
            <span className="block text-[11px] text-white/60">{formatPercent(calc.summary.savingsPercent)} · 1º mês</span>
          </span>
        </div>
        )}
        {calc.summary.savingsFirstYear > 0 && (
          <div className="pt-1.5 text-right text-xs text-white/60">
            Em 12 meses: <span className="font-bold text-white">{formatBRL(calc.summary.savingsFirstYear)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function IncludedItems({ p, update }: FormProps) {
  const { modules } = useAppData()
  const items = p.investment.items
  const [draft, setDraft] = useState('')
  const included = items.filter((i) => i.included).length
  const inList = new Set(items.map((i) => i.moduleId).filter(Boolean))
  const missing = libraryItems(modules).filter((m) => !inList.has(m.id))
  const byId = new Map(modules.map((m) => [m.id, m]))
  const groups = [...MODULE_CATEGORIES, 'Personalizados'].map((cat) => ({
    cat,
    rows: items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => (it.moduleId && byId.get(it.moduleId)?.category ? byId.get(it.moduleId)!.category : 'Personalizados') === cat),
  }))
  const setAll = (v: boolean) => update((d) => d.investment.items.forEach((i) => void (i.included = v)))
  const add = () => {
    const name = draft.trim()
    if (!name) return
    update((d) => void d.investment.items.push({ id: uid(), moduleId: null, name, included: true }))
    setDraft('')
  }
  const fromProject = p.project.moduleIds.length > 0

  return (
    <Section
      title="O que está incluso"
      description="Marque tudo o que o cliente recebe na mensalidade. Só os itens marcados aparecem no slide."
      action={<span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">{included} selecionados</span>}
    >
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setAll(true)}>
          Selecionar todos
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAll(false)}>
          Limpar
        </Button>
        {fromProject && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              update((d) => {
                for (const id of d.project.moduleIds) {
                  const it = d.investment.items.find((x) => x.moduleId === id)
                  const m = byId.get(id)
                  if (it) it.included = true
                  else if (m) d.investment.items.push(itemFromModule(m, true))
                }
              })
            }
          >
            Usar módulos do projeto
          </Button>
        )}
        {missing.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => update((d) => void d.investment.items.push(...missing.map((m) => itemFromModule(m, false))))}>
            <Plus /> Novos itens da biblioteca ({missing.length})
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {groups
          .filter((g) => g.rows.length)
          .map((g) => (
            <div key={g.cat}>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{g.cat}</div>
              <div className="grid gap-2 @md:grid-cols-2">
                {g.rows.map(({ it, i }) => (
                  <label
                    key={it.id}
                    className={cn(
                      'group flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition-all hover:border-ink/25',
                      it.included && 'border-brand bg-brand/[0.04] ring-1 ring-brand',
                    )}
                  >
                    <Checkbox
                      checked={it.included}
                      aria-label={`Incluir ${it.name}`}
                      onCheckedChange={(v) => update((d) => void (d.investment.items[i]!.included = !!v))}
                    />
                    <span className={cn('min-w-0 flex-1 truncate text-sm font-semibold', !it.included && 'text-ink/70')}>{it.name}</span>
                    {!it.moduleId && (
                      <button
                        type="button"
                        aria-label={`Remover ${it.name}`}
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault()
                          update((d) => void d.investment.items.splice(i, 1))
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Adicionar item personalizado (ex.: Treinamento da equipe)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus /> Adicionar
        </Button>
      </div>
      {included > 12 && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
          <Sparkles className="h-3.5 w-3.5" /> Com muitos itens o slide reduz a fonte automaticamente. Até 12 fica mais legível.
        </p>
      )}
    </Section>
  )
}

export function InvestmentForm({ p, update, showSummary = true }: FormProps & { showSummary?: boolean }) {
  const inv = p.investment
  const calc = calcInvestment(inv)
  const impl = calc.implementation

  return (
    <>
      <Section title="Investimento por posto" description="Mensalidade por posto e implantação escalonada. Tudo é calculado automaticamente." action={<SectionToggle p={p} update={update} k="investment" />}>
        <Field label="Quantidade de postos" htmlFor="inv-stations">
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_STATIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update((d) => void (d.investment.stations = n))}
                className={cn(
                  'h-10 min-w-12 rounded-md border px-3 text-sm font-bold tabular-nums transition-all',
                  inv.stations === n ? 'border-ink bg-ink text-white' : 'bg-white hover:border-ink/30',
                )}
              >
                {n}
              </button>
            ))}
            <NumberInput id="inv-stations" min={1} value={inv.stations} onChange={(n) => update((d) => void (d.investment.stations = n))} className="w-24" />
          </div>
        </Field>
      </Section>

      <IncludedItems p={p} update={update} />

      <Section title="Mensalidade" description="Valor cobrado por posto, por mês.">
        <div className="grid gap-4 @xl:grid-cols-3">
          <Field label="Valor de tabela por posto" htmlFor="mp">
            <MoneyInput id="mp" value={inv.monthlyPrice} onChange={(n) => update((d) => void (d.investment.monthlyPrice = n))} />
          </Field>
          <Field label="Desconto" htmlFor="md">
            <DiscountInput id="md" base={calc.monthly.table} value={inv.monthlyDiscount} onChange={(v) => update((d) => void (d.investment.monthlyDiscount = v))} />
          </Field>
          <Field label="Valor final por posto" htmlFor="mf" hint="Digite o valor fechado e o desconto é calculado.">
            <MoneyInput id="mf" value={calc.monthly.final} onChange={(n) => update((d) => void (d.investment.monthlyDiscount = discountForFinal(calc.monthly.table, n)))} />
          </Field>
        </div>
        <div className="grid gap-3 rounded-lg bg-mist p-4 @2xl:grid-cols-2">
          <div>
            <Line label="Valor de tabela" value={`${formatBRL(calc.monthly.table)}/posto`} />
            <Line label="Desconto" value={`- ${formatBRL(calc.monthly.discount)}`} muted />
            <div className="my-1 h-px bg-border" />
            <Line label="Investimento mensal" value={`${formatBRL(calc.monthly.final)}/posto/mês`} strong accent />
          </div>
          {calc.stations > 1 && (
            <div className="rounded-md border bg-white p-3 @2xl:self-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total da rede</div>
              <div className="text-xl font-extrabold tabular-nums text-ink">{formatBRL(calc.monthlyNetwork.final)} / mês</div>
              <div className="text-xs text-muted-foreground">
                {calc.stations} postos × {formatBRL(calc.monthly.final)}
              </div>
            </div>
          )}
        </div>
        <Field label="Observação no card de preço" htmlFor="note">
          <Input id="note" value={inv.note} onChange={(e) => update((d) => void (d.investment.note = e.target.value))} />
        </Field>
      </Section>

      <Section title="Implantação" description="Valor único: um valor para o primeiro posto e outro para cada posto adicional.">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-mist/60 p-3">
          <Checkbox checked={inv.implementationFree} onCheckedChange={(v) => update((d) => void (d.investment.implementationFree = !!v))} aria-label="Implantação gratuita" />
          <span className="text-sm font-semibold">Implantação gratuita</span>
          {inv.implementationFree && <span className="ml-auto rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">Implantação: Isenta</span>}
        </label>
        <div className={cn('space-y-4', inv.implementationFree && 'pointer-events-none opacity-50')}>
          <div className="grid gap-4 @xl:grid-cols-2">
            <Field label="1º posto" htmlFor="if1">
              <MoneyInput id="if1" value={inv.implementationFirst} onChange={(n) => update((d) => void (d.investment.implementationFirst = n))} />
            </Field>
            <Field label="Cada posto adicional" htmlFor="ifa">
              <MoneyInput id="ifa" value={inv.implementationAdditional} onChange={(n) => update((d) => void (d.investment.implementationAdditional = n))} />
            </Field>
          </div>
          <div className="rounded-lg bg-mist p-4">
            <Line label="1º posto" value={formatBRL(impl.first)} />
            {impl.additionalStations > 0 && <Line label={`${impl.additionalStations} postos adicionais × ${formatBRL(impl.additional)}`} value={formatBRL(impl.additional * impl.additionalStations)} />}
            <div className="my-1 h-px bg-border" />
            <Line label="Implantação de tabela" value={formatBRL(impl.table)} strong />
          </div>
          <div className="grid gap-4 @xl:grid-cols-2">
            <Field label="Desconto" htmlFor="idc">
              <DiscountInput id="idc" base={impl.table} value={inv.implementationDiscount} onChange={(v) => update((d) => void (d.investment.implementationDiscount = v))} />
            </Field>
            <Field label="Valor final" htmlFor="if">
              <MoneyInput id="if" value={impl.final} onChange={(n) => update((d) => void (d.investment.implementationDiscount = discountForFinal(impl.table, n)))} />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Descontos personalizados"
        description="Descontos adicionais aplicados em cascata na implantação ou na mensalidade."
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => update((d) => void d.investment.customDiscounts.push({ id: uid(), label: 'Desconto especial', type: 'percent', value: 5, target: 'monthly' }))}
          >
            <Plus /> Desconto
          </Button>
        }
      >
        {inv.customDiscounts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum desconto adicional.</p>}
        {inv.customDiscounts.map((cd, i) => (
          <div key={cd.id} className="grid items-end gap-2 rounded-lg border bg-mist/60 p-3 @xl:grid-cols-[1fr_150px_1fr_auto]">
            <Field label="Descrição">
              <Input value={cd.label} onChange={(e) => update((d) => void (d.investment.customDiscounts[i]!.label = e.target.value))} />
            </Field>
            <Field label="Aplicar em">
              <Select value={cd.target} onValueChange={(v) => update((d) => void (d.investment.customDiscounts[i]!.target = v as typeof cd.target))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensalidade</SelectItem>
                  <SelectItem value="implementation">Implantação</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Desconto">
              <DiscountInput
                base={cd.target === 'implementation' ? impl.table : calc.monthly.table}
                value={cd}
                onChange={(v) => update((d) => Object.assign(d.investment.customDiscounts[i]!, v))}
              />
            </Field>
            <Button variant="ghost" size="icon" aria-label="Remover desconto" onClick={() => update((d) => void d.investment.customDiscounts.splice(i, 1))}>
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        ))}
      </Section>

      <Section
        title="Sob consumo"
        description="Custos variáveis cobrados conforme o uso."
        action={
          <Button size="sm" variant="outline" onClick={() => update((d) => void d.investment.consumption.push({ id: uid(), name: '', price: 0, unit: 'disparo' }))}>
            <Plus /> Item
          </Button>
        }
      >
        {inv.consumption.map((c, i) => (
          <div key={c.id} className="grid grid-cols-[1fr_130px_120px_auto] items-center gap-2">
            <Input aria-label="Item" placeholder="Ex.: WhatsApp" value={c.name} onChange={(e) => update((d) => void (d.investment.consumption[i]!.name = e.target.value))} />
            <MoneyInput aria-label="Preço" decimals={2} value={c.price} onChange={(n) => update((d) => void (d.investment.consumption[i]!.price = n))} />
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/</span>
              <Input aria-label="Unidade" className="pl-6" value={c.unit} onChange={(e) => update((d) => void (d.investment.consumption[i]!.unit = e.target.value))} />
            </div>
            <Button variant="ghost" size="icon" aria-label="Remover item" onClick={() => update((d) => void d.investment.consumption.splice(i, 1))}>
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        ))}
        {inv.consumption.length > 3 && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <Sparkles className="h-3.5 w-3.5" /> O slide mostra os 3 primeiros itens.
          </p>
        )}
      </Section>

      {showSummary && <FinancialSummary calc={calc} />}
    </>
  )
}
