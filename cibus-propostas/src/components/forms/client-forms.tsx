import { useEffect } from 'react'
import type { Draft } from 'immer'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppData } from '@/lib/app-data'
import { applyProductDefaults, execSnapshot } from '@/lib/templates'
import { profileOf } from '@/lib/products'
import { PRODUCTS, SEGMENTS, type CoverImageFit, type Proposal, type SlideKey } from '@/lib/types'
import { CharCount, Field, ImageUpload, NumberInput, Section } from './fields'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export type Update = (fn: (d: Draft<Proposal>) => void) => void
export interface FormProps {
  p: Proposal
  update: Update
}

export const UF = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

const maskCNPJ = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function SectionToggle({ p, update, k }: FormProps & { k: SlideKey }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm">
      <Switch
        checked={p.sections[k]}
        onCheckedChange={(v) => update((d) => void (d.sections[k] = v))}
        className="h-5 w-9 [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
      />
      {p.sections[k] ? 'Página incluída' : 'Página oculta'}
    </label>
  )
}

export function ClientForm({ p, update }: FormProps) {
  const c = p.client
  const set = <K extends keyof Proposal['client']>(k: K, v: Proposal['client'][K]) => update((d) => void (d.client[k] = v))
  return (
    <Section title="Informações do cliente" description="Quem vai receber esta proposta.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente *" htmlFor="client-name">
          <Input id="client-name" placeholder="Nome do cliente" value={c.contactName} onChange={(e) => set('contactName', e.target.value)} />
        </Field>
        <Field label="Empresa *" htmlFor="company">
          <Input id="company" placeholder="Nome da empresa" value={c.company} onChange={(e) => set('company', e.target.value)} />
        </Field>
        <Field label="CNPJ" htmlFor="cnpj" hint="Opcional">
          <Input id="cnpj" placeholder="00.000.000/0000-00" value={c.cnpj} onChange={(e) => set('cnpj', maskCNPJ(e.target.value))} />
        </Field>
        <Field label="Segmento">
          <Select value={c.segment} onValueChange={(v) => set('segment', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
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
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Estado">
            <Select value={c.state} onValueChange={(v) => set('state', v)}>
              <SelectTrigger aria-label="Estado">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UF.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cidade" htmlFor="city">
            <Input id="city" value={c.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Qtd. de ${profileOf(p.meta.product).unit.many}`} htmlFor="stations">
            <NumberInput
              id="stations"
              min={1}
              value={c.stations}
              onChange={(n) =>
                update((d) => {
                  // mantém a quantidade do investimento sincronizada enquanto não for alterada lá
                  if (d.investment.stations === d.client.stations) d.investment.stations = n
                  d.client.stations = n
                })
              }
            />
          </Field>
          <Field label="Qtd. de CNPJs" htmlFor="cnpjs">
            <NumberInput id="cnpjs" min={1} value={c.cnpjs} onChange={(n) => set('cnpjs', n)} />
          </Field>
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo do contato" htmlFor="role">
          <Input id="role" placeholder="Ex.: Diretor comercial" value={c.contactRole} onChange={(e) => set('contactRole', e.target.value)} />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" value={c.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Telefone / WhatsApp" htmlFor="phone">
          <Input id="phone" placeholder="(00) 00000-0000" value={c.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} />
        </Field>
      </div>
    </Section>
  )
}

export function ProposalMetaForm({ p, update }: FormProps) {
  const { executives, settings } = useAppData()
  const m = p.meta
  return (
    <Section title="Dados da proposta" description="Aparecem na capa e no encerramento.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título da proposta" htmlFor="ptitle" className="sm:col-span-2">
          <Input id="ptitle" value={m.title} onChange={(e) => update((d) => void (d.meta.title = e.target.value))} />
        </Field>
        <Field label="Produto *">
          <Select value={m.product} onValueChange={(v) => update((d) => void Object.assign(d, applyProductDefaults(p, v, settings)))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Data da proposta *" htmlFor="pdate">
          <Input id="pdate" type="date" value={m.date} onChange={(e) => update((d) => void (d.meta.date = e.target.value))} />
        </Field>
        <Field label="Validade" htmlFor="validity">
          <Input id="validity" value={m.validity} onChange={(e) => update((d) => void (d.meta.validity = e.target.value))} />
        </Field>
        <Field label="Executivo responsável">
          <Select
            value={m.executiveId ?? ''}
            onValueChange={(id) => {
              const e = executives.find((x) => x.id === id) ?? null
              update((d) => {
                d.meta.executiveId = id
                d.meta.executive = execSnapshot(e)
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {executives
                .filter((e) => e.active || e.id === m.executiveId)
                .map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Logo do cliente" hint="Aparece ao lado do logo Cibus na capa. PNG com fundo transparente fica melhor.">
        <ImageUpload value={p.client.logo} onChange={(v) => update((d) => void (d.client.logo = v))} aspect="h-24" fit="contain" label="Enviar logo" />
      </Field>
    </Section>
  )
}

const COVER_FITS: { value: CoverImageFit; label: string; hint: string }[] = [
  { value: 'auto', label: 'Automático', hint: 'Vertical preenche o espaço; horizontal aparece inteira numa moldura' },
  { value: 'fill', label: 'Preencher', hint: 'Ocupa todo o espaço (as bordas podem ser cortadas)' },
  { value: 'fit', label: 'Imagem inteira', hint: 'Mostra a imagem toda, numa moldura' },
]

/** Largura ÷ altura de uma imagem. */
function imageRatio(src: string) {
  return new Promise<number | undefined>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : undefined)
    img.onerror = () => resolve(undefined)
    img.src = src
  })
}

export function CoverForm({ p, update }: FormProps) {
  // guarda a proporção da imagem para o layout da capa (também nas imagens antigas)
  const { image, imageRatio: ratio } = p.cover
  useEffect(() => {
    if (!image || ratio) return
    let alive = true
    imageRatio(image).then((r) => {
      if (alive && r) update((d) => void (d.cover.image === image && (d.cover.imageRatio = Math.round(r * 1000) / 1000)))
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, ratio])
  return (
    <Section title="Capa" description="Use *asteriscos* para destacar um trecho em laranja.">
      <Field label="Título da capa" htmlFor="ctitle" aside={<CharCount value={p.cover.title} max={70} />}>
        <Input id="ctitle" value={p.cover.title} onChange={(e) => update((d) => void (d.cover.title = e.target.value))} />
      </Field>
      <Field label="Subtítulo" htmlFor="csub">
        <Input id="csub" value={p.cover.subtitle} onChange={(e) => update((d) => void (d.cover.subtitle = e.target.value))} />
      </Field>
      <Field
        label="Imagem da capa"
        hint="Sem imagem, usamos a arte padrão Cibus. Tamanho ideal para preencher o espaço: 1000 × 1200 px (vertical). Imagens horizontais, como prints de tela, aparecem inteiras numa moldura."
      >
        <ImageUpload
          value={p.cover.image}
          onChange={(v) =>
            update((d) => {
              d.cover.image = v
              d.cover.imageRatio = undefined
            })
          }
          aspect="h-44"
          fit="contain"
        />
      </Field>
      {p.cover.image && (
        <Field label="Ajuste da imagem">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {COVER_FITS.map((f) => (
              <button
                key={f.value}
                type="button"
                title={f.hint}
                onClick={() => update((d) => void (d.cover.imageFit = f.value))}
                className={cn(
                  'rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
                  (p.cover.imageFit ?? 'auto') === f.value ? 'bg-white text-ink shadow-sm' : 'text-muted-foreground hover:text-ink',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Field>
      )}
    </Section>
  )
}

export function ClosingForm({ p, update }: FormProps) {
  return (
    <Section title="Encerramento" description="Os contatos vêm do executivo responsável e das configurações.">
      <Field label="Título" htmlFor="cltitle" aside={<CharCount value={p.closing.title} max={80} />}>
        <Input id="cltitle" value={p.closing.title} onChange={(e) => update((d) => void (d.closing.title = e.target.value))} />
      </Field>
      <Field label="Chamada (CTA)" htmlFor="clcta">
        <Input id="clcta" value={p.closing.cta} onChange={(e) => update((d) => void (d.closing.cta = e.target.value))} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone do executivo" htmlFor="exphone">
          <Input id="exphone" value={p.meta.executive.phone} onChange={(e) => update((d) => void (d.meta.executive.phone = maskPhone(e.target.value)))} />
        </Field>
        <Field label="WhatsApp do executivo" htmlFor="exwa">
          <Input id="exwa" value={p.meta.executive.whatsapp} onChange={(e) => update((d) => void (d.meta.executive.whatsapp = maskPhone(e.target.value)))} />
        </Field>
        <Field label="E-mail do executivo" htmlFor="exmail" className="sm:col-span-2">
          <Input id="exmail" value={p.meta.executive.email} onChange={(e) => update((d) => void (d.meta.executive.email = e.target.value))} />
        </Field>
      </div>
    </Section>
  )
}
