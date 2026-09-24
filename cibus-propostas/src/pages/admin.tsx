import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Blocks, BookOpenCheck, Pencil, Plus, Save, Settings2, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Field, ImageUpload, MoneyInput, RichText, Section } from '@/components/forms/fields'
import { SlideFrame } from '@/components/slides/frame'
import { CaseSlide } from '@/components/slides/slides'
import { useAppData } from '@/lib/app-data'
import { repo } from '@/lib/repo'
import { TEMPLATES, uid } from '@/lib/templates'
import { MODULE_CATEGORIES, SEGMENTS, type AppSettings, type CaseDef, type Executive, type ModuleDef } from '@/lib/types'
import { cn, initials } from '@/lib/utils'

export default function Admin() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'modules'
  return (
    <main className="container animate-fade-up py-10">
      <h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-ink">Configurações</h1>
      <p className="mt-1 text-muted-foreground">Bibliotecas e padrões usados em todas as propostas.</p>
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t })} className="mt-8">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="modules">
            <Blocks /> Itens inclusos
          </TabsTrigger>
          <TabsTrigger value="cases">
            <BookOpenCheck /> Cases
          </TabsTrigger>
          <TabsTrigger value="executives">
            <Users /> Executivos
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 /> Geral
          </TabsTrigger>
        </TabsList>
        <TabsContent value="modules">
          <ModulesAdmin />
        </TabsContent>
        <TabsContent value="cases">
          <CasesAdmin />
        </TabsContent>
        <TabsContent value="executives">
          <ExecutivesAdmin />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsAdmin />
        </TabsContent>
      </Tabs>
    </main>
  )
}

/* ------------------------------------------------------------------ helpers */

function useCrud<T extends { id: string }>(save: (x: T) => Promise<void>, remove: (id: string) => Promise<void>) {
  const { reload } = useAppData()
  const [editing, setEditing] = useState<T | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  const doSave = async (x: T) => {
    try {
      await save(x)
      await reload()
      setEditing(null)
      toast.success('Salvo')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const doDelete = async () => {
    if (!deleting) return
    try {
      await remove(deleting.id)
      await reload()
      toast.success('Excluído')
    } catch (e) {
      toast.error((e as Error).message)
    }
    setDeleting(null)
  }
  return { editing, setEditing, deleting, setDeleting, doSave, doDelete }
}

/* ------------------------------------------------------------------ módulos */

function ModulesAdmin() {
  const { modules } = useAppData()
  const crud = useCrud<ModuleDef>(repo.saveModule, repo.deleteModule)
  const blank = (): ModuleDef => ({ id: uid(), name: '', description: '', category: 'Fidelidade', defaultPrice: 0, active: true, sortOrder: modules.length })
  const e = crud.editing
  return (
    <Section
      title="Itens inclusos"
      description="Recursos da Cibus. Aparecem para seleção em “O que está incluso” (investimento) e em “Módulos do projeto”."
      action={
        <Button onClick={() => crud.setEditing(blank())}>
          <Plus /> Novo item
        </Button>
      }
    >
      {MODULE_CATEGORIES.map((cat) => {
        const list = modules.filter((m) => m.category === cat)
        if (!list.length) return null
        return (
          <div key={cat}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{cat}</div>
            <div className="divide-y rounded-lg border">
              {list.map((m) => (
                <div key={m.id} className={cn('flex items-center gap-4 px-4 py-3', !m.active && 'opacity-50')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      {m.name} {!m.active && <Badge variant="muted">Inativo</Badge>}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{m.description}</div>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Editar ${m.name}`} onClick={() => crud.setEditing(m)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Excluir ${m.name}`} onClick={() => crud.setDeleting(m)}>
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <Dialog open={!!e} onOpenChange={(o) => !o && crud.setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modules.some((m) => m.id === e?.id) ? 'Editar item' : 'Novo item'}</DialogTitle>
          </DialogHeader>
          {e && (
            <div className="space-y-4">
              <Field label="Nome">
                <Input autoFocus value={e.name} onChange={(ev) => crud.setEditing({ ...e, name: ev.target.value })} />
              </Field>
              <Field label="Descrição">
                <Input value={e.description} onChange={(ev) => crud.setEditing({ ...e, description: ev.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoria">
                  <Select value={e.category} onValueChange={(v) => crud.setEditing({ ...e, category: v as ModuleDef['category'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <Switch checked={e.active} onCheckedChange={(v) => crud.setEditing({ ...e, active: v })} /> Ativo
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => crud.setEditing(null)}>
              Cancelar
            </Button>
            <Button disabled={!e?.name.trim()} onClick={() => e && crud.doSave(e)}>
              <Save /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(o) => !o && crud.setDeleting(null)}
        title={`Excluir “${crud.deleting?.name}”?`}
        description="Propostas existentes mantêm o item. Para apenas esconder de novas propostas, desative-o."
        confirmLabel="Excluir"
        destructive
        onConfirm={crud.doDelete}
      />
    </Section>
  )
}

/* -------------------------------------------------------------------- cases */

function CasesAdmin() {
  const data = useAppData()
  const crud = useCrud<CaseDef>(repo.saveCase, repo.deleteCase)
  const blank = (): CaseDef => ({
    id: uid(),
    name: '',
    company: '',
    segment: 'Posto de combustível',
    location: '',
    headline: '',
    description: '',
    logo: '',
    image: '',
    metrics: [
      { name: 'Ticket médio', value: '' },
      { name: 'Aumento', value: '' },
    ],
    active: true,
  })
  const e = crud.editing
  const set = (patch: Partial<CaseDef>) => e && crud.setEditing({ ...e, ...patch })
  const preview = e && TEMPLATES[0]!.build({ settings: data.settings, modules: data.modules, executive: null })

  return (
    <Section
      title="Biblioteca de cases"
      description="Cases selecionáveis nas propostas. Cada case vira uma página visual."
      action={
        <Button onClick={() => crud.setEditing(blank())}>
          <Plus /> Novo case
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.cases.map((c) => (
          <div key={c.id} className={cn('overflow-hidden rounded-xl border bg-white', !c.active && 'opacity-60')}>
            <div className="relative aspect-[16/8] bg-ink">
              {c.image ? (
                <img src={c.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-extrabold text-white/80">{initials(c.name)}</div>
              )}
              {c.logo && <img src={c.logo} alt="" className="absolute bottom-3 left-3 h-8 max-w-[110px] rounded-md bg-white object-contain px-2 py-1" />}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 font-bold text-ink">
                {c.name} {!c.active && <Badge variant="muted">Inativo</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">{[c.segment, c.location].filter(Boolean).join(' · ') || '—'}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.metrics.length ? (
                  c.metrics.map((m, i) => (
                    <span key={i} className="rounded-md bg-mist px-2 py-1 text-xs">
                      <span className="text-muted-foreground">{m.name}:</span> <span className="font-bold">{m.value || '—'}</span>
                    </span>
                  ))
                ) : (
                  <Badge variant="warning">Sem métricas</Badge>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => crud.setEditing(structuredClone(c))}>
                  <Pencil /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => crud.setDeleting(c)} aria-label={`Excluir ${c.name}`}>
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!e} onOpenChange={(o) => !o && crud.setEditing(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{data.cases.some((c) => c.id === e?.id) ? 'Editar case' : 'Novo case'}</DialogTitle>
          </DialogHeader>
          {e && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome do case">
                    <Input autoFocus placeholder="Ex.: Posto Tucumã" value={e.name} onChange={(ev) => set({ name: ev.target.value })} />
                  </Field>
                  <Field label="Cliente / empresa">
                    <Input value={e.company} onChange={(ev) => set({ company: ev.target.value })} />
                  </Field>
                  <Field label="Segmento">
                    <Select value={e.segment} onValueChange={(v) => set({ segment: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Localização">
                    <Input placeholder="Cidade — UF" value={e.location} onChange={(ev) => set({ location: ev.target.value })} />
                  </Field>
                </div>
                <Field label="Frase de destaque">
                  <Input placeholder="Mais resultado com uma operação de fidelidade mais eficiente." value={e.headline} onChange={(ev) => set({ headline: ev.target.value })} />
                </Field>
                <div className="grid grid-cols-[1fr_1.6fr] gap-3">
                  <Field label="Logo">
                    <ImageUpload value={e.logo} onChange={(v) => set({ logo: v })} aspect="h-28" fit="contain" label="Logo" />
                  </Field>
                  <Field label="Imagem">
                    <ImageUpload value={e.image} onChange={(v) => set({ image: v })} aspect="h-28" label="Foto do cliente" />
                  </Field>
                </div>
                <Field label="Descrição / contexto">
                  <RichText value={e.description} onChange={(v) => set({ description: v })} minHeight={110} max={380} />
                </Field>
                <Field label="Resultados (até 4)" hint="Use “→” para antes e depois: R$ 58,50 → R$ 85,40">
                  <div className="space-y-2">
                    {e.metrics.map((m, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1.3fr_auto] gap-2">
                        <Input
                          placeholder={`Resultado ${i + 1}`}
                          value={m.name}
                          onChange={(ev) => set({ metrics: e.metrics.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)) })}
                        />
                        <Input
                          placeholder="Valor"
                          className="font-semibold"
                          value={m.value}
                          onChange={(ev) => set({ metrics: e.metrics.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)) })}
                        />
                        <Button variant="ghost" size="icon" aria-label="Remover resultado" onClick={() => set({ metrics: e.metrics.filter((_, j) => j !== i) })}>
                          <Trash2 className="text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    {e.metrics.length < 4 && (
                      <Button size="sm" variant="outline" onClick={() => set({ metrics: [...e.metrics, { name: '', value: '' }] })}>
                        <Plus /> Resultado
                      </Button>
                    )}
                  </div>
                </Field>
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <Switch checked={e.active} onCheckedChange={(v) => set({ active: v })} /> Disponível para novas propostas
                </label>
              </div>
              <div className="lg:sticky lg:top-0 lg:self-start">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Prévia do slide</div>
                <div className="overflow-hidden rounded-lg shadow-lift ring-1 ring-ink/5">
                  {preview && (
                    <SlideFrame>
                      <CaseSlide p={{ ...preview, client: { ...preview.client, company: 'Cliente' } }} ctx={data} cs={e} single page={6} total={8} index={5} />
                    </SlideFrame>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => crud.setEditing(null)}>
              Cancelar
            </Button>
            <Button disabled={!e?.name.trim()} onClick={() => e && crud.doSave({ ...e, metrics: e.metrics.filter((m) => m.name || m.value) })}>
              <Save /> Salvar case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(o) => !o && crud.setDeleting(null)}
        title={`Excluir “${crud.deleting?.name}”?`}
        description="O case será removido também das propostas que o utilizam. Para apenas esconder, desative-o."
        confirmLabel="Excluir"
        destructive
        onConfirm={crud.doDelete}
      />
    </Section>
  )
}

/* --------------------------------------------------------------- executivos */

function ExecutivesAdmin() {
  const { executives } = useAppData()
  const crud = useCrud<Executive>(repo.saveExecutive, repo.deleteExecutive)
  const e = crud.editing
  const set = (patch: Partial<Executive>) => e && crud.setEditing({ ...e, ...patch })
  return (
    <Section
      title="Executivos"
      description="Aparecem na capa (“Apresentado por”) e no encerramento."
      action={
        <Button onClick={() => crud.setEditing({ id: uid(), name: '', email: '', phone: '', whatsapp: '', role: 'Executivo de Contas', photo: '', active: true })}>
          <Plus /> Novo executivo
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {executives.map((x) => (
          <div key={x.id} className={cn('flex items-center gap-4 rounded-xl border bg-white p-4', !x.active && 'opacity-60')}>
            {x.photo ? (
              <img src={x.photo} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand font-bold text-white">{initials(x.name)}</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-ink">{x.name}</div>
              <div className="truncate text-sm text-muted-foreground">{x.role}</div>
              <div className="truncate text-xs text-muted-foreground">{x.email}</div>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Editar ${x.name}`} onClick={() => crud.setEditing(x)}>
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Excluir ${x.name}`} onClick={() => crud.setDeleting(x)}>
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={!!e} onOpenChange={(o) => !o && crud.setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{executives.some((x) => x.id === e?.id) ? 'Editar executivo' : 'Novo executivo'}</DialogTitle>
          </DialogHeader>
          {e && (
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <Field label="Foto">
                <ImageUpload value={e.photo} onChange={(v) => set({ photo: v })} aspect="aspect-square" label="Foto" />
              </Field>
              <div className="space-y-3">
                <Field label="Nome">
                  <Input autoFocus value={e.name} onChange={(ev) => set({ name: ev.target.value })} />
                </Field>
                <Field label="Cargo">
                  <Input value={e.role} onChange={(ev) => set({ role: ev.target.value })} />
                </Field>
              </div>
              <Field label="E-mail" className="sm:col-span-2">
                <Input type="email" value={e.email} onChange={(ev) => set({ email: ev.target.value })} />
              </Field>
              <Field label="Telefone">
                <Input value={e.phone} onChange={(ev) => set({ phone: ev.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <Input value={e.whatsapp} onChange={(ev) => set({ whatsapp: ev.target.value })} />
              </Field>
              <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
                <Switch checked={e.active} onCheckedChange={(v) => set({ active: v })} /> Ativo
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => crud.setEditing(null)}>
              Cancelar
            </Button>
            <Button disabled={!e?.name.trim()} onClick={() => e && crud.doSave(e)}>
              <Save /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!crud.deleting}
        onOpenChange={(o) => !o && crud.setDeleting(null)}
        title={`Excluir ${crud.deleting?.name}?`}
        description="Propostas existentes mantêm os dados do executivo."
        confirmLabel="Excluir"
        destructive
        onConfirm={crud.doDelete}
      />
    </Section>
  )
}

/* ------------------------------------------------------------ configurações */

function SettingsAdmin() {
  const { settings, reload } = useAppData()
  const [s, setS] = useState<AppSettings>(settings)
  const [busy, setBusy] = useState(false)
  useEffect(() => setS(settings), [settings])
  const d = s.defaults
  const setD = (patch: Partial<AppSettings['defaults']>) => setS({ ...s, defaults: { ...d, ...patch } })

  return (
    <div className="space-y-5">
      <Section title="Identidade visual">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo Cibus (fundo claro)" hint="Em branco usa o logotipo padrão.">
            <ImageUpload value={s.logo} onChange={(v) => setS({ ...s, logo: v })} aspect="h-28" fit="contain" label="Enviar logo" />
          </Field>
          <Field label="Logo Cibus (fundo escuro)" hint="Usado nas páginas escuras (ROI e encerramento).">
            <ImageUpload value={s.logoDark} onChange={(v) => setS({ ...s, logoDark: v })} aspect="h-28" fit="contain" label="Enviar logo" dark />
          </Field>
          {(
            [
              ['brandColor', 'Cor principal (laranja)'],
              ['inkColor', 'Cor escura'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <div className="flex gap-2">
                <input type="color" value={s[k]} onChange={(ev) => setS({ ...s, [k]: ev.target.value })} className="h-10 w-12 cursor-pointer rounded-md border bg-white p-1" aria-label={label} />
                <Input value={s[k]} onChange={(ev) => setS({ ...s, [k]: ev.target.value })} className="font-mono uppercase" />
              </div>
            </Field>
          ))}
        </div>
      </Section>
      <Section title="Contato e links">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="URL da calculadora de ROI" className="sm:col-span-2" hint="Aberta pelo botão “Simular ROI” (inclusive no PDF).">
            <Input value={s.roiUrl} onChange={(ev) => setS({ ...s, roiUrl: ev.target.value })} placeholder="https://" />
          </Field>
          <Field label="Site">
            <Input value={s.site} onChange={(ev) => setS({ ...s, site: ev.target.value })} />
          </Field>
          <Field label="E-mail comercial">
            <Input value={s.contactEmail} onChange={(ev) => setS({ ...s, contactEmail: ev.target.value })} />
          </Field>
          <Field label="Telefone comercial">
            <Input value={s.contactPhone} onChange={(ev) => setS({ ...s, contactPhone: ev.target.value })} />
          </Field>
        </div>
      </Section>
      <Section title="Padrões de novas propostas">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título da proposta">
            <Input value={d.proposalTitle} onChange={(ev) => setD({ proposalTitle: ev.target.value })} />
          </Field>
          <Field label="Validade">
            <Input value={d.validity} onChange={(ev) => setD({ validity: ev.target.value })} />
          </Field>
          <Field label="Título da capa" className="sm:col-span-2" hint="Use *asteriscos* para destacar em laranja.">
            <Input value={d.coverTitle} onChange={(ev) => setD({ coverTitle: ev.target.value })} />
          </Field>
          <Field label="Subtítulo da capa">
            <Input value={d.coverSubtitle} onChange={(ev) => setD({ coverSubtitle: ev.target.value })} />
          </Field>
          <Field label="Mensalidade por posto">
            <MoneyInput value={d.monthlyPrice} onChange={(n) => setD({ monthlyPrice: n })} />
          </Field>
          <Field label="Implantação · 1º posto">
            <MoneyInput value={d.implementationFirst} onChange={(n) => setD({ implementationFirst: n })} />
          </Field>
          <Field label="Implantação · cada posto adicional">
            <MoneyInput value={d.implementationAdditional} onChange={(n) => setD({ implementationAdditional: n })} />
          </Field>
          <Field label="Observação do preço">
            <Input value={d.note} onChange={(ev) => setD({ note: ev.target.value })} />
          </Field>
          <Field label="Título do encerramento" className="sm:col-span-2">
            <Input value={d.closingTitle} onChange={(ev) => setD({ closingTitle: ev.target.value })} />
          </Field>
        </div>
      </Section>
      <div className="sticky bottom-4 flex justify-end">
        <Button
          size="lg"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await repo.saveSettings(s)
              await reload()
              toast.success('Configurações salvas')
            } catch (e) {
              toast.error((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <Save /> Salvar configurações
        </Button>
      </div>
    </div>
  )
}
