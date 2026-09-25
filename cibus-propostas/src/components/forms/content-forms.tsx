import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, ImageOff, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { useAppData } from '@/lib/app-data'
import { uid } from '@/lib/templates'
import { MODULE_CATEGORIES, type CaseDef } from '@/lib/types'
import { cn, initials } from '@/lib/utils'
import { SectionToggle, type FormProps } from './client-forms'
import { CharCount, Field, ListEditor, RichText, Section } from './fields'

/* ------------------------------------------------------------------ Cenário */

export function ScenarioForm({ p, update }: FormProps) {
  const s = p.scenario
  return (
    <>
      <Section title="Cenário atual" description="Entendendo o momento atual do cliente." action={<SectionToggle p={p} update={update} k="scenario" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título da página" htmlFor="stitle">
            <Input id="stitle" value={s.title} onChange={(e) => update((d) => void (d.scenario.title = e.target.value))} />
          </Field>
          <Field label="Subtítulo" htmlFor="ssub">
            <Input id="ssub" value={s.subtitle} onChange={(e) => update((d) => void (d.scenario.subtitle = e.target.value))} />
          </Field>
        </div>
        <Field
          label="Operação atual"
          htmlFor="sop"
          hint="Uma frase de destaque que resume a operação hoje."
          aside={<CharCount value={s.currentOperation} max={180} />}
        >
          <Textarea
            id="sop"
            rows={3}
            placeholder="Ex.: Rede com 12 postos, sem programa de fidelidade estruturado e comunicação feita manualmente pelo WhatsApp."
            value={s.currentOperation}
            onChange={(e) => update((d) => void (d.scenario.currentOperation = e.target.value))}
          />
        </Field>
        <Field
          label="Contexto do cliente"
          hint="Fale sobre fidelização, sistemas, gargalos, ticket médio, frequência, campanhas, concorrentes…"
        >
          <RichText
            value={s.body}
            onChange={(v) => update((d) => void (d.scenario.body = v))}
            minHeight={200}
            max={600}
            placeholder="Como funciona a operação hoje? Como o cliente trabalha fidelização? Quais sistemas usa?"
          />
        </Field>
      </Section>
      <Section title="Principais desafios" description="Aparecem em destaque no card escuro. Recomendado: até 5.">
        <ListEditor
          items={s.challenges}
          onChange={(v) => update((d) => void (d.scenario.challenges = v))}
          addLabel="Adicionar desafio"
          placeholder="Ex.: Baixa recorrência"
          maxItems={5}
        />
      </Section>
      <Section title="Oportunidades identificadas" description="Viram cards visuais na parte inferior. Recomendado: até 4.">
        <ListEditor
          items={s.opportunities}
          onChange={(v) => update((d) => void (d.scenario.opportunities = v))}
          addLabel="Adicionar oportunidade"
          placeholder="Ex.: Aumentar a frequência de abastecimento"
          maxItems={4}
          maxChars={70}
        />
      </Section>
    </>
  )
}

/* ------------------------------------------------------------------ Projeto */

export function ProjectForm({ p, update }: FormProps) {
  const pr = p.project
  return (
    <>
      <Section title="O projeto" description="Como o Cibus pode transformar essa operação." action={<SectionToggle p={p} update={update} k="project" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título da página" htmlFor="ptitle2">
            <Input id="ptitle2" value={pr.title} onChange={(e) => update((d) => void (d.project.title = e.target.value))} />
          </Field>
          <Field label="Subtítulo" htmlFor="psub">
            <Input id="psub" value={pr.subtitle} onChange={(e) => update((d) => void (d.project.subtitle = e.target.value))} />
          </Field>
        </div>
        <Field label="Objetivo do projeto">
          <RichText value={pr.objective} onChange={(v) => update((d) => void (d.project.objective = v))} max={320} placeholder="O que o cliente quer alcançar?" />
        </Field>
        <Field label="Estratégia proposta">
          <RichText value={pr.strategy} onChange={(v) => update((d) => void (d.project.strategy = v))} max={320} placeholder="Como vamos chegar lá?" />
        </Field>
        <Field label="Como o Cibus ajuda">
          <RichText
            value={pr.howCibusHelps}
            onChange={(v) => update((d) => void (d.project.howCibusHelps = v))}
            max={320}
            placeholder="Quais recursos do Cibus resolvem os desafios?"
          />
        </Field>
      </Section>
      <ModulePicker p={p} update={update} />
    </>
  )
}

function ModulePicker({ p, update }: FormProps) {
  const { modules } = useAppData()
  const selected = new Set(p.project.moduleIds)
  const toggle = (id: string) =>
    update((d) => {
      const i = d.project.moduleIds.indexOf(id)
      if (i >= 0) d.project.moduleIds.splice(i, 1)
      else d.project.moduleIds.push(id)
    })
  return (
    <Section
      title="Módulos Cibus do projeto"
      description="Selecione os recursos que fazem parte da solução. Eles aparecem agrupados no slide."
      action={<span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">{selected.size} selecionados</span>}
    >
      <div className="space-y-4">
        {MODULE_CATEGORIES.map((cat) => {
          const list = modules.filter((m) => m.category === cat && (m.active || selected.has(m.id)))
          if (!list.length) return null
          return (
            <div key={cat}>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{cat}</div>
              <div className="flex flex-wrap gap-2">
                {list.map((m) => {
                  const on = selected.has(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      title={m.description}
                      onClick={() => toggle(m.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all',
                        on ? 'border-brand bg-brand text-white shadow-[0_4px_12px_-4px_rgb(var(--brand)/.6)]' : 'bg-white text-ink hover:border-ink/30',
                      )}
                    >
                      {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ---------------------------------------------------------------------- ROI */

export function RoiForm({ p, update }: FormProps) {
  const { settings } = useAppData()
  const r = p.roi
  return (
    <>
      <Section title="O retorno do Cibus" description="Uma página curta que leva o cliente ao simulador de ROI." action={<SectionToggle p={p} update={update} k="roi" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" htmlFor="rtitle">
            <Input id="rtitle" value={r.title} onChange={(e) => update((d) => void (d.roi.title = e.target.value))} />
          </Field>
          <Field label="Subtítulo" htmlFor="rsub">
            <Input id="rsub" value={r.subtitle} onChange={(e) => update((d) => void (d.roi.subtitle = e.target.value))} />
          </Field>
        </div>
        <Field label="Pergunta de destaque" htmlFor="rq" aside={<CharCount value={r.question} max={90} />}>
          <Input id="rq" value={r.question} onChange={(e) => update((d) => void (d.roi.question = e.target.value))} />
        </Field>
      </Section>
      <Section
        title="Indicadores"
        description="Valores curtos e de impacto. Ex.: “+ até 45%”, “R$ 38 mil/mês”, “8,4x”."
        action={
          r.indicators.length < 4 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => update((d) => void d.roi.indicators.push({ id: uid(), label: '', value: '', hint: '' }))}
            >
              <Plus /> Indicador
            </Button>
          )
        }
      >
        <div className="space-y-3">
          {r.indicators.map((ind, i) => (
            <div key={ind.id} className="grid gap-2 rounded-lg border bg-mist/60 p-3 sm:grid-cols-[1fr_140px_auto]">
              <Input
                aria-label="Indicador"
                placeholder="Indicador"
                value={ind.label}
                onChange={(e) => update((d) => void (d.roi.indicators[i]!.label = e.target.value))}
              />
              <Input
                aria-label="Valor"
                placeholder="Valor"
                className="font-bold text-brand"
                value={ind.value}
                onChange={(e) => update((d) => void (d.roi.indicators[i]!.value = e.target.value))}
              />
              <Button variant="ghost" size="icon" aria-label="Remover indicador" onClick={() => update((d) => void d.roi.indicators.splice(i, 1))}>
                <Trash2 className="text-muted-foreground" />
              </Button>
              <Input
                aria-label="Descrição"
                placeholder="Descrição curta (opcional)"
                className="sm:col-span-3"
                value={ind.hint}
                onChange={(e) => update((d) => void (d.roi.indicators[i]!.hint = e.target.value))}
              />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Chamada para o simulador">
        <Field label="Título do CTA" htmlFor="rct">
          <Input id="rct" value={r.ctaTitle} onChange={(e) => update((d) => void (d.roi.ctaTitle = e.target.value))} />
        </Field>
        <Field label="Texto" htmlFor="rctt" aside={<CharCount value={r.ctaText} max={130} />}>
          <Textarea id="rctt" rows={2} value={r.ctaText} onChange={(e) => update((d) => void (d.roi.ctaText = e.target.value))} />
        </Field>
        <Field
          label="Link do simulador (opcional)"
          htmlFor="rurl"
          hint={
            <>
              Em branco, usa o link padrão das configurações: <span className="font-medium text-ink">{settings.roiUrl || '—'}</span>. O botão fica clicável no PDF.
            </>
          }
        >
          <Input id="rurl" placeholder={settings.roiUrl} value={r.url} onChange={(e) => update((d) => void (d.roi.url = e.target.value))} />
        </Field>
      </Section>
    </>
  )
}

/* -------------------------------------------------------------------- Cases */

function CaseThumb({ cs, className }: { cs: CaseDef; className?: string }) {
  if (cs.image) return <img src={cs.image} alt="" className={cn('object-cover', className)} />
  if (cs.logo) return <img src={cs.logo} alt="" className={cn('bg-ink object-contain p-2', className)} />
  return <div className={cn('flex items-center justify-center bg-ink text-sm font-extrabold text-white', className)}>{initials(cs.name)}</div>
}

function SortableCase({ cs, onRemove, index }: { cs: CaseDef; onRemove: () => void; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cs.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-3 rounded-lg border bg-white p-2.5 pr-3', isDragging && 'relative z-10 shadow-lift')}
    >
      <button type="button" className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing" aria-label="Arrastar para reordenar" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="w-5 text-center text-xs font-bold tabular-nums text-brand">{index + 1}</span>
      <CaseThumb cs={cs} className="h-10 w-14 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-ink">{cs.name}</div>
        <div className="truncate text-xs text-muted-foreground">{[cs.segment, cs.location].filter(Boolean).join(' · ') || '—'}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remover ${cs.name}`}>
        <X className="text-muted-foreground" />
      </Button>
    </div>
  )
}

export function CasesForm({ p, update }: FormProps) {
  const { cases } = useAppData()
  const ids = p.cases.caseIds
  const chosen = ids.map((id) => cases.find((c) => c.id === id)).filter((c): c is CaseDef => !!c)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const toggle = (id: string) =>
    update((d) => {
      const i = d.cases.caseIds.indexOf(id)
      if (i >= 0) d.cases.caseIds.splice(i, 1)
      else d.cases.caseIds.push(id)
    })
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    update((d) => {
      const from = d.cases.caseIds.indexOf(String(e.active.id))
      const to = d.cases.caseIds.indexOf(String(e.over!.id))
      d.cases.caseIds = arrayMove(d.cases.caseIds, from, to)
    })
  }
  return (
    <>
      <Section title="Cases" description="Quem já transforma fidelidade em resultado." action={<SectionToggle p={p} update={update} k="cases" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título da seção" htmlFor="cstitle">
            <Input id="cstitle" value={p.cases.title} onChange={(e) => update((d) => void (d.cases.title = e.target.value))} />
          </Field>
          <Field label="Subtítulo" htmlFor="cssub">
            <Input id="cssub" value={p.cases.subtitle} onChange={(e) => update((d) => void (d.cases.subtitle = e.target.value))} />
          </Field>
        </div>
      </Section>
      <Section title="Escolha os cases" description="Cada case selecionado vira uma página, na ordem escolhida.">
        <div className="grid gap-2 sm:grid-cols-2">
          {cases
            .filter((c) => c.active || ids.includes(c.id))
            .map((c) => {
              const on = ids.includes(c.id)
              return (
                <label
                  key={c.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-2.5 transition-all hover:border-ink/25',
                    on && 'border-brand bg-brand/[0.04] ring-1 ring-brand',
                  )}
                >
                  <Checkbox checked={on} onCheckedChange={() => toggle(c.id)} aria-label={c.name} />
                  <CaseThumb cs={c} className="h-10 w-12 shrink-0 rounded-md" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.metrics.length ? `${c.metrics.length} métricas` : <span className="inline-flex items-center gap-1 text-amber-600"><ImageOff className="h-3 w-3" /> sem métricas</span>}
                    </div>
                  </div>
                </label>
              )
            })}
        </div>
        <p className="text-xs text-muted-foreground">
          Faltando algum case? Cadastre em{' '}
          <Link to="/admin?tab=cases" className="font-semibold text-brand hover:underline">
            Configurações › Cases
          </Link>
          .
        </p>
      </Section>
      {chosen.length > 0 && (
        <Section title="Ordem de apresentação" description="Arraste para reordenar.">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={chosen.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {chosen.map((c, i) => (
                  <SortableCase key={c.id} cs={c} index={i} onRemove={() => toggle(c.id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </Section>
      )}
    </>
  )
}
