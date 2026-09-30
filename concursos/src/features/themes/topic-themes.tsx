import { ArrowDown, ArrowUp, Check, ChevronDown, Lightbulb, ListTree, Loader2, NotebookPen, Plus, Shapes, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RichEditor } from '@/components/editor/rich-editor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDeleteTheme, useSaveTheme, useThemes } from '@/data/queries'
import { rootThemes, subthemesOf, themePreview, treeHasContent, type Theme } from '@/domain/themes'
import { uuid } from '@/lib/storage'
import { cn, formatRelative } from '@/lib/utils'

const AUTOSAVE_MS = 800

/**
 * Temas do assunto: cartões em lista, cada um com o seu resumo e pontos
 * importantes. Clicar no cartão abre a caixa de edição; dentro dela, o tema
 * pode ter subtemas (mesma estrutura, um nível). Tudo é salvo
 * automaticamente.
 */
export function TopicThemes({ topicId }: { topicId: string }) {
  const query = useThemes()
  const saveTheme = useSaveTheme()
  const deleteTheme = useDeleteTheme()
  const all = useMemo(() => (query.data ?? []).filter((t) => t.topicId === topicId), [query.data, topicId])
  const roots = useMemo(() => rootThemes(all), [all])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Theme | null>(null)

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const create = (title: string, parentId: string | null) => {
    const siblings = parentId ? subthemesOf(all, parentId) : roots
    const now = new Date().toISOString()
    const theme: Theme = { id: uuid(), topicId, parentId, title, summary: '', keyPoints: '', order: (siblings.at(-1)?.order ?? -1) + 1, createdAt: now, updatedAt: now }
    saveTheme.mutate(theme, { onError: () => toast.error(parentId ? 'Não foi possível criar o subtema.' : 'Não foi possível criar o tema.') })
    setOpenIds((prev) => new Set(prev).add(theme.id))
  }

  // Troca a posição com o vizinho da mesma lista
  const move = (theme: Theme, siblings: Theme[], dir: -1 | 1) => {
    const i = siblings.findIndex((t) => t.id === theme.id)
    const other = siblings[i + dir]
    if (!other) return
    saveTheme.mutate({ ...theme, order: other.order })
    saveTheme.mutate({ ...other, order: theme.order === other.order ? theme.order - dir : theme.order })
  }

  // Excluir um tema leva junto os subtemas
  const remove = (theme: Theme) => {
    for (const sub of subthemesOf(all, theme.id)) deleteTheme.mutate({ topicId, themeId: sub.id })
    deleteTheme.mutate({ topicId, themeId: theme.id })
  }
  const askRemove = (theme: Theme) => (treeHasContent(theme, all) ? setConfirmDelete(theme) : remove(theme))

  const card = (theme: Theme, label: string, siblings: Theme[], i: number, children?: React.ReactNode) => (
    <ThemeCard
      key={theme.id}
      theme={theme}
      label={label}
      nested={!!theme.parentId}
      subCount={theme.parentId ? 0 : subthemesOf(all, theme.id).length}
      open={openIds.has(theme.id)}
      onToggle={() => toggle(theme.id)}
      onSave={(t) => saveTheme.mutateAsync(t)}
      onMove={(dir) => move(theme, siblings, dir)}
      canMoveUp={i > 0}
      canMoveDown={i < siblings.length - 1}
      onDelete={() => askRemove(theme)}
    >
      {children}
    </ThemeCard>
  )

  const confirmSubs = confirmDelete ? subthemesOf(all, confirmDelete.id).length : 0

  return (
    <section aria-labelledby="section-themes" className="pt-1">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Shapes className="size-4 text-primary dark:text-primary-soft" aria-hidden />
        <h2 id="section-themes" className="font-bold tracking-tight">
          Temas do assunto
        </h2>
        {roots.length > 0 && <span className="rounded-full bg-primary-tint px-2 py-px text-xs font-bold text-primary tabular-nums dark:text-primary-soft">{roots.length}</span>}
        <p className="hidden min-w-0 flex-1 truncate text-xs text-muted sm:block">Divida o assunto em temas e subtemas, cada um com resumo e pontos importantes.</p>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setAdding(true)}>
          <Plus /> Adicionar tema
        </Button>
      </div>

      <div className="space-y-3">
        {roots.length === 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted transition hover:border-primary/50 hover:bg-primary-tint/30"
          >
            <span className="font-semibold text-foreground">Nenhum tema ainda</span>
            Ex.: em “Poder constituinte”, crie os temas Originário e Derivado — e, dentro de Derivado, os subtemas Reformador, Decorrente e Revisor.
          </button>
        )}

        {roots.map((theme, i) => {
          const subs = subthemesOf(all, theme.id)
          return card(
            theme,
            String(i + 1),
            roots,
            i,
            <SubthemeList parent={theme} label={String(i + 1)} subthemes={subs} onCreate={(title) => create(title, theme.id)} renderCard={(sub, j) => card(sub, `${i + 1}.${j + 1}`, subs, j)} />,
          )
        })}

        {adding && (
          <AddThemeForm
            label="Nome do novo tema"
            placeholder="Nome do tema (ex.: Poder Constituinte Originário)"
            submitLabel="Criar tema"
            onCancel={() => setAdding(false)}
            onCreate={(title) => {
              create(title, null)
              setAdding(false)
            }}
          />
        )}
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>{confirmDelete?.parentId ? 'Excluir subtema?' : 'Excluir tema?'}</DialogTitle>
          <DialogDescription>
            O resumo e os pontos importantes de “{confirmDelete?.title}”
            {confirmSubs > 0 ? `, e ${confirmSubs === 1 ? 'o subtema' : `os ${confirmSubs} subtemas`} dele,` : ''} serão apagados.
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90"
              onClick={() => {
                if (confirmDelete) remove(confirmDelete)
                toast(confirmDelete?.parentId ? 'Subtema excluído' : 'Tema excluído')
                setConfirmDelete(null)
              }}
            >
              <Trash2 /> Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function AddThemeForm({
  label,
  placeholder,
  submitLabel,
  onCreate,
  onCancel,
}: {
  label: string
  placeholder: string
  submitLabel: string
  onCreate: (title: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  return (
    <form
      className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-surface p-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim()) onCreate(title.trim())
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="flex-1"
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!title.trim()}>
          <Plus /> {submitLabel}
        </Button>
      </div>
    </form>
  )
}

/** Subtemas dentro da caixa de um tema. */
function SubthemeList({
  parent,
  label,
  subthemes,
  onCreate,
  renderCard,
}: {
  parent: Theme
  label: string
  subthemes: Theme[]
  onCreate: (title: string) => void
  renderCard: (sub: Theme, index: number) => React.ReactNode
}) {
  const [adding, setAdding] = useState(false)
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4" role="group" aria-label={`Subtemas de ${parent.title}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ListTree className="size-4 text-primary dark:text-primary-soft" aria-hidden />
        <p className="text-sm font-bold">Subtemas</p>
        {subthemes.length > 0 && <span className="rounded-full bg-primary-tint px-2 py-px text-xs font-bold text-primary tabular-nums dark:text-primary-soft">{subthemes.length}</span>}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAdding(true)}>
          <Plus /> Adicionar subtema
        </Button>
      </div>
      <div className="space-y-2.5">
        {subthemes.length === 0 && !adding && (
          <p className="text-sm text-muted">Separe o conteúdo deste tema em partes menores, cada uma com o seu resumo (ex.: {label}.1, {label}.2…).</p>
        )}
        {subthemes.map((sub, j) => renderCard(sub, j))}
        {adding && (
          <AddThemeForm
            label="Nome do novo subtema"
            placeholder="Nome do subtema"
            submitLabel="Criar subtema"
            onCancel={() => setAdding(false)}
            onCreate={(title) => {
              onCreate(title)
              setAdding(false)
            }}
          />
        )}
      </div>
    </div>
  )
}

type Draft = Pick<Theme, 'title' | 'summary' | 'keyPoints'>
const sameDraft = (a: Draft, b: Draft) => a.title === b.title && a.summary === b.summary && a.keyPoints === b.keyPoints

function ThemeCard({
  theme,
  label,
  nested,
  subCount,
  children,
  open,
  onToggle,
  onSave,
  onMove,
  canMoveUp,
  canMoveDown,
  onDelete,
}: {
  theme: Theme
  /** Número mostrado no cartão ("2" ou "2.1") */
  label: string
  nested: boolean
  subCount: number
  children?: React.ReactNode
  open: boolean
  onToggle: () => void
  onSave: (theme: Theme) => Promise<Theme>
  onMove: (dir: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<Draft>({ title: theme.title, summary: theme.summary, keyPoints: theme.keyPoints })
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const latest = useRef({ draft, theme, onSave })
  useEffect(() => {
    latest.current = { draft, theme, onSave }
  })

  const flush = () => {
    const { draft: d, theme: t, onSave: save } = latest.current
    if (sameDraft(d, t) || !d.title.trim()) return
    setState('saving')
    save({ ...t, ...d, title: d.title.trim() })
      .then(() => setState('saved'))
      .catch(() => {
        setState('error')
        toast.error('Não foi possível salvar o tema.')
      })
  }

  // Salvamento automático pouco depois de parar de digitar
  useEffect(() => {
    if (sameDraft(draft, theme)) return
    const id = setTimeout(flush, AUTOSAVE_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  // Ao fechar a página ou sair do assunto, grava o que faltou
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const preview = themePreview({ ...theme, ...draft })
  const noun = nested ? 'subtema' : 'tema'
  const pending = !sameDraft(draft, theme)

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border transition',
        nested ? 'rounded-xl bg-background/60' : 'bg-surface',
        open ? 'border-primary/40 shadow-soft' : 'border-border hover:border-primary/30',
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (open) flush()
          onToggle()
        }}
        aria-expanded={open}
        aria-controls={`theme-${theme.id}`}
        className={cn('flex w-full items-start gap-3 text-left', nested ? 'px-3 py-2.5 sm:px-4' : 'px-4 py-3.5 sm:px-5')}
      >
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-lg bg-primary-tint font-extrabold text-primary tabular-nums dark:text-primary-soft',
            nested ? 'h-7 min-w-7 px-1 text-xs' : 'size-8 text-sm',
          )}
        >
          {label}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block font-bold leading-snug', nested && 'text-sm')}>{draft.title.trim() || theme.title}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">{preview || `Clique para escrever o resumo deste ${noun}.`}</span>
          {subCount > 0 && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-xs font-semibold text-muted">
              <ListTree className="size-3" aria-hidden /> {subCount} {subCount === 1 ? 'subtema' : 'subtemas'}
            </span>
          )}
        </span>
        <span className="hidden shrink-0 pt-1 text-xs text-subtle sm:block">{formatRelative(theme.updatedAt)}</span>
        <ChevronDown className={cn('mt-1 size-5 shrink-0 text-muted transition', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div id={`theme-${theme.id}`} className={cn('space-y-4 border-t border-border px-4 py-4', nested ? 'sm:px-4' : 'bg-background/40 sm:px-5')}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Nome do {noun}</span>
            <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} aria-label={`Nome do ${noun}`} />
          </label>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <NotebookPen className="size-4 text-primary dark:text-primary-soft" aria-hidden /> Resumo do {noun}
            </p>
            <RichEditor
              value={draft.summary}
              onChange={(html) => setDraft((d) => ({ ...d, summary: html }))}
              placeholder={`O essencial deste ${noun} com suas palavras…`}
              ariaLabel={`Resumo do ${noun} ${theme.title}`}
              minHeight={nested ? 120 : 160}
            />
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Lightbulb className="size-4 text-primary dark:text-primary-soft" aria-hidden /> Pontos importantes
            </p>
            <RichEditor
              value={draft.keyPoints}
              onChange={(html) => setDraft((d) => ({ ...d, keyPoints: html }))}
              placeholder="Prazos, exceções, súmulas, artigos-chave…"
              ariaLabel={`Pontos importantes do ${noun} ${theme.title}`}
              minHeight={100}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto flex items-center gap-1.5 text-xs text-muted" role="status">
              {state === 'saving' || pending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Salvando…
                </>
              ) : state === 'error' ? (
                <span className="text-danger">Erro ao salvar</span>
              ) : (
                <>
                  <Check className="size-3.5 text-success" aria-hidden /> Salvo automaticamente
                </>
              )}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label={`Mover ${noun} para cima`}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label={`Mover ${noun} para baixo`}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-tint hover:text-danger" onClick={onDelete}>
              <Trash2 /> Excluir {noun}
            </Button>
          </div>
          {children}
        </div>
      )}
    </article>
  )
}
