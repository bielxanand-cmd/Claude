import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, GripVertical, ImagePlus, Italic, List, ListOrdered, Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { repo } from '@/lib/repo'
import { cn, textLength } from '@/lib/utils'

/* ------------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
  aside,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
  htmlFor?: string
  aside?: ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {aside}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Section({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-[220px] flex-1">
          <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-5 @container">{children}</div>
    </section>
  )
}

/** Contador de caracteres com limite recomendado para o slide. */
export function CharCount({ value, max, html }: { value: string; max: number; html?: boolean }) {
  const n = html ? textLength(value) : value.length
  const over = n > max
  return (
    <span className={cn('text-[11px] font-medium tabular-nums', over ? 'text-amber-600' : 'text-muted-foreground')}>
      {n}/{max}
      {over && ' · acima do recomendado'}
    </span>
  )
}

/* ------------------------------------------------------------------------ */

const parseBRL = (s: string) => {
  const clean = s.replace(/[^\d,.-]/g, '')
  if (!clean) return 0
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}
const fmt = (n: number, decimals = 2) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: Math.max(decimals, 4) }).format(n || 0)

export function MoneyInput({
  value,
  onChange,
  prefix = 'R$',
  suffix,
  decimals = 2,
  className,
  id,
  disabled,
  ...rest
}: {
  value: number
  onChange: (n: number) => void
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
  id?: string
  disabled?: boolean
  'aria-label'?: string
}) {
  const [text, setText] = useState(fmt(value, decimals))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(fmt(value, decimals))
  }, [value, decimals])
  return (
    <div className={cn('relative', className)}>
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
      <Input
        id={id}
        disabled={disabled}
        inputMode="decimal"
        className={cn('tabular-nums', prefix && 'pl-10', suffix && 'pr-10')}
        value={text}
        aria-label={rest['aria-label']}
        onFocus={(e) => {
          focused.current = true
          e.currentTarget.select()
        }}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseBRL(e.target.value))
        }}
        onBlur={() => {
          focused.current = false
          setText(fmt(parseBRL(text), decimals))
        }}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
    </div>
  )
}

export function NumberInput({ value, onChange, min = 0, ...p }: { value: number; onChange: (n: number) => void; min?: number; id?: string; className?: string }) {
  return (
    <Input
      type="number"
      min={min}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(e.target.value === '' ? min : Math.max(min, Number(e.target.value)))}
      className={cn('tabular-nums', p.className)}
      id={p.id}
    />
  )
}

/* ------------------------------------------------------------------------ */

export function ImageUpload({
  value,
  onChange,
  label = 'Enviar imagem',
  aspect = 'aspect-video',
  fit = 'cover',
  className,
  dark,
}: {
  value: string
  onChange: (url: string) => void
  label?: string
  aspect?: string
  fit?: 'cover' | 'contain'
  className?: string
  dark?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const pick = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Envie um arquivo de imagem (JPG, PNG, SVG ou WebP).')
    setBusy(true)
    try {
      onChange(await repo.uploadImage(file))
    } catch (e) {
      toast.error(`Não foi possível enviar a imagem: ${(e as Error).message}`)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-dashed border-input transition-colors hover:border-brand/60',
        dark ? 'bg-ink' : 'bg-mist',
        aspect,
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        pick(e.dataTransfer.files?.[0])
      }}
    >
      {value ? (
        <>
          <img src={value} alt="" className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain p-3')} />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="sm" variant="outline" type="button" onClick={() => input.current?.click()}>
              Trocar
            </Button>
            <Button size="sm" variant="destructive" type="button" onClick={() => onChange('')}>
              <X /> Remover
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={cn('flex h-full w-full flex-col items-center justify-center gap-2 text-sm font-medium', dark ? 'text-white/70' : 'text-muted-foreground')}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span>{busy ? 'Enviando…' : label}</span>
          <span className="text-[11px] font-normal opacity-70">ou arraste o arquivo aqui</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}

/* ------------------------------------------------------------------------ */

export function RichText({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  max,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  max?: number
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false, code: false, link: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Escreva aqui…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    editorProps: { attributes: { class: 'rich text-sm leading-relaxed text-ink' } },
  })

  // Sincroniza quando o valor muda de fora (ex.: trocar de proposta)
  useEffect(() => {
    if (editor && !editor.isFocused && value !== (editor.isEmpty ? '' : editor.getHTML())) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  const Tool = ({ active, onClick, children, label }: { active?: boolean; onClick: () => void; children: ReactNode; label: string }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('rounded p-1.5 text-muted-foreground hover:bg-white hover:text-ink', active && 'bg-white text-ink shadow-sm')}
    >
      {children}
    </button>
  )

  return (
    <div className="overflow-hidden rounded-md border border-input bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)] focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
      <div className="flex items-center gap-0.5 border-b bg-mist px-1.5 py-1">
        <Tool label="Negrito" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Tool>
        <Tool label="Itálico" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Tool>
        <Tool label="Lista" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </Tool>
        <Tool label="Lista numerada" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </Tool>
        {max && (
          <span className="ml-auto pr-1.5">
            <CharCount value={value} max={max} html />
          </span>
        )}
      </div>
      <div className="px-3 py-2.5" style={{ minHeight }}>
        <EditorContent editor={editor} style={{ minHeight: minHeight - 20 }} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

/** Lista editável de itens curtos (desafios, oportunidades). */
export function ListEditor({
  items,
  onChange,
  addLabel,
  placeholder,
  maxItems,
  maxChars = 60,
}: {
  items: string[]
  onChange: (items: string[]) => void
  addLabel: string
  placeholder?: string
  maxItems?: number
  maxChars?: number
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...items, v])
    setDraft('')
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it!)
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="group flex items-center gap-1.5">
          <div className="flex flex-col opacity-40 group-hover:opacity-100">
            <button type="button" aria-label="Mover para cima" className="leading-none text-muted-foreground hover:text-ink" onClick={() => move(i, i - 1)}>
              <GripVertical className="h-4 w-4" />
            </button>
          </div>
          <Input
            value={it}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            className={cn(it.length > maxChars && 'border-amber-400')}
          />
          <Button type="button" variant="ghost" size="icon" aria-label="Remover" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 className="text-muted-foreground" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus /> {addLabel}
        </Button>
      </div>
      {maxItems && items.length > maxItems && (
        <p className="text-xs font-medium text-amber-600">
          Recomendamos até {maxItems} itens para manter o slide limpo. Os excedentes serão agrupados automaticamente.
        </p>
      )}
    </div>
  )
}
