import { useState } from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppData } from '@/lib/app-data'
import { calcInvestment, discountAmount, discountForFinal, formatBRL, formatPercent, type InvestmentCalc } from '@/lib/pricing'
import { moduleRowFromDef, uid } from '@/lib/templates'
import type { Discount } from '@/lib/types'
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
        <div className="mt-2 flex items-center justify-between rounded-lg bg-brand/15 px-3 py-2.5">
          <span className="text-sm font-semibold text-white">Economia gerada</span>
          <span className="text-right">
            <span className="block font-extrabold tabular-nums text-brand">{formatBRL(calc.summary.savings)}</span>
            <span className="block text-[11px] text-white/60">{formatPercent(calc.summary.savingsPercent)} · 1º mês</span>
          </span>
        </div>
        {calc.summary.savingsFirstYear > 0 && (
          <div className="pt-1.5 text-right text-xs text-white/60">
            Em 12 meses: <span className="font-bold text-white">{formatBRL(calc.summary.savingsFirstYear)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function AddModuleDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (m: { name: string; description: string; table: number; negotiated: number }) => void }) {
  const [f, setF] = useState({ name: '', description: '', table: 0, negotiated: 0 })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar módulo</DialogTitle>
          <DialogDescription>Um módulo personalizado apenas para esta proposta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Nome do módulo" htmlFor="nm-name">
            <Input id="nm-name" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Descrição" htmlFor="nm-desc">
            <Input id="nm-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor de tabela" htmlFor="nm-table">
              <MoneyInput id="nm-table" value={f.table} onChange={(n) => setF((x) => ({ ...x, table: n, negotiated: x.negotiated === x.table ? n : x.negotiated }))} />
            </Field>
            <Field label="Valor negociado" htmlFor="nm-neg">
              <MoneyInput id="nm-neg" value={f.negotiated} onChange={(n) => setF({ ...f, negotiated: n })} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!f.name.trim()}
            onClick={() => {
              onAdd(f)
              setF({ name: '', description: '', table: 0, negotiated: 0 })
              onOpenChange(false)
            }}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InvestmentForm({ p, update, showSummary = true }: FormProps & { showSummary?: boolean }) {
  const { modules } = useAppData()
  const inv = p.investment
  const calc = calcInvestment(inv)
  const [adding, setAdding] = useState(false)
  const inTable = new Set(inv.modules.map((m) => m.moduleId).filter(Boolean))
  const available = modules.filter((m) => m.active && !inTable.has(m.id))

  return (
    <>
      <Section title="Investimento por posto" description="Configure módulos, valores e descontos. Tudo é calculado automaticamente." action={<SectionToggle p={p} update={update} k="investment" />}>
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

      <Section
        title="Módulos contratados"
        description="Todos aparecem na tabela do slide; os marcados como inclusos ficam em destaque."
        action={
          <div className="flex gap-2">
            {available.length > 0 && (
              <Select
                value=""
                onValueChange={(id) => {
                  const m = modules.find((x) => x.id === id)
                  if (m) update((d) => void d.investment.modules.push(moduleRowFromDef(m, true)))
                }}
              >
                <SelectTrigger className="h-8 w-auto gap-1.5 text-xs font-semibold">
                  <SelectValue placeholder="Da biblioteca" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus /> Adicionar módulo
            </Button>
          </div>
        }
      >
        <div className="@container">
          <div className="hidden grid-cols-[1.25rem_minmax(0,1fr)_8.5rem_8.5rem_2.25rem] gap-3 px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground @xl:grid">
            <span />
            <span>Módulo</span>
            <span>Valor de tabela</span>
            <span>Negociado</span>
            <span />
          </div>
          <div className="divide-y rounded-lg border">
            {inv.modules.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  'grid grid-cols-[1.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-3 gap-y-2 px-3 py-2.5 transition-colors @xl:grid-cols-[1.25rem_minmax(0,1fr)_8.5rem_8.5rem_2.25rem] @xl:px-1',
                  m.included && 'bg-brand/[0.04]',
                )}
              >
                <Checkbox
                  checked={m.included}
                  aria-label={`Incluir ${m.name}`}
                  className="@xl:ml-2"
                  onCheckedChange={(v) => update((d) => void (d.investment.modules[i]!.included = !!v))}
                />
                <Input
                  value={m.name}
                  aria-label="Nome do módulo"
                  className={cn('h-9 border-transparent bg-transparent px-2 font-semibold shadow-none hover:border-input', !m.included && 'text-muted-foreground')}
                  onChange={(e) => update((d) => void (d.investment.modules[i]!.name = e.target.value))}
                />
                <div className="col-span-3 col-start-1 row-start-2 grid grid-cols-2 gap-2 pl-8 @xl:contents">
                  <MoneyInput
                    aria-label={`Valor de tabela ${m.name}`}
                    value={m.tablePrice}
                    onChange={(n) =>
                      update((d) => {
                        const row = d.investment.modules[i]!
                        if (row.negotiatedPrice === row.tablePrice) row.negotiatedPrice = n
                        row.tablePrice = n
                      })
                    }
                  />
                  <MoneyInput
                    aria-label={`Valor negociado ${m.name}`}
                    value={m.negotiatedPrice}
                    onChange={(n) => update((d) => void (d.investment.modules[i]!.negotiatedPrice = n))}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-start-3 row-start-1 @xl:col-start-auto @xl:row-start-auto"
                  aria-label={`Remover ${m.name}`}
                  onClick={() =>
                    update((d) => {
                      d.investment.customDiscounts = d.investment.customDiscounts.filter((c) => c.moduleRowId !== m.id)
                      d.investment.modules.splice(i, 1)
                    })
                  }
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm font-bold">
            <span>
              {calc.includedCount} {calc.includedCount === 1 ? 'módulo incluso' : 'módulos inclusos'}
            </span>
            <span className="tabular-nums">
              <span className="font-medium text-muted-foreground">Tabela </span>
              {formatBRL(calc.monthly.table)}
              <span className="font-medium text-muted-foreground"> · Negociado </span>
              {formatBRL(calc.monthly.negotiated)}
            </span>
          </div>
        </div>
        <AddModuleDialog
          open={adding}
          onOpenChange={setAdding}
          onAdd={(f) =>
            update((d) =>
              void d.investment.modules.push({
                id: uid(),
                moduleId: null,
                name: f.name.trim(),
                description: f.description,
                tablePrice: f.table,
                negotiatedPrice: f.negotiated,
                included: true,
              }),
            )
          }
        />
      </Section>

      <Section title="Mensalidade" description="Desconto aplicado por posto sobre o valor negociado dos módulos.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Valor de tabela">
            <div className="flex h-10 items-center rounded-md border bg-mist px-3 text-sm font-semibold tabular-nums">{formatBRL(calc.monthly.table)}</div>
          </Field>
          <Field label="Desconto" htmlFor="md">
            <DiscountInput id="md" base={calc.monthly.negotiated} value={inv.monthlyDiscount} onChange={(v) => update((d) => void (d.investment.monthlyDiscount = v))} />
          </Field>
          <Field label="Valor final por posto" htmlFor="mf" hint="Digite o valor fechado e o desconto é calculado.">
            <MoneyInput
              id="mf"
              value={calc.monthly.final}
              onChange={(n) => update((d) => void (d.investment.monthlyDiscount = discountForFinal(calc.monthly.negotiated, n)))}
            />
          </Field>
        </div>
        <div className="grid gap-3 rounded-lg bg-mist p-4 @2xl:grid-cols-2">
          <div>
            <Line label="Valor de tabela" value={formatBRL(calc.monthly.table)} />
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

      <Section title="Implantação" description="Valor único cobrado no início do projeto.">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-mist/60 p-3">
          <Checkbox
            checked={inv.implementationFree}
            onCheckedChange={(v) => update((d) => void (d.investment.implementationFree = !!v))}
            aria-label="Implantação gratuita"
          />
          <span className="text-sm font-semibold">Implantação gratuita</span>
          {inv.implementationFree && <span className="ml-auto rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">Implantação: Isenta</span>}
        </label>
        <div className={cn('grid gap-4 sm:grid-cols-3', inv.implementationFree && 'pointer-events-none opacity-50')}>
          <Field label="Valor da implantação" htmlFor="ip">
            <MoneyInput id="ip" value={inv.implementationPrice} onChange={(n) => update((d) => void (d.investment.implementationPrice = n))} />
          </Field>
          <Field label="Desconto" htmlFor="idc">
            <DiscountInput id="idc" base={inv.implementationPrice} value={inv.implementationDiscount} onChange={(v) => update((d) => void (d.investment.implementationDiscount = v))} />
          </Field>
          <Field label="Valor final" htmlFor="if">
            <MoneyInput
              id="if"
              value={calc.implementation.final}
              onChange={(n) => update((d) => void (d.investment.implementationDiscount = discountForFinal(inv.implementationPrice, n)))}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Descontos personalizados"
        description="Descontos adicionais aplicados em cascata na implantação, na mensalidade ou em um módulo."
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
          <div key={cd.id} className="grid items-end gap-2 rounded-lg border bg-mist/60 p-3 sm:grid-cols-[1fr_150px_1fr_auto]">
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
                  <SelectItem value="module">Módulo específico</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Desconto">
              <DiscountInput
                base={cd.target === 'implementation' ? inv.implementationPrice : calc.monthly.negotiated}
                value={cd}
                onChange={(v) => update((d) => Object.assign(d.investment.customDiscounts[i]!, v))}
              />
            </Field>
            <Button variant="ghost" size="icon" aria-label="Remover desconto" onClick={() => update((d) => void d.investment.customDiscounts.splice(i, 1))}>
              <Trash2 className="text-muted-foreground" />
            </Button>
            {cd.target === 'module' && (
              <div className="sm:col-span-4">
                <Select value={cd.moduleRowId ?? ''} onValueChange={(v) => update((d) => void (d.investment.customDiscounts[i]!.moduleRowId = v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {inv.modules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
