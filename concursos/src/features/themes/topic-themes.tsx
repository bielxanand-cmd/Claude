import { ArrowDown, ArrowUp, Check, ChevronDown, Lightbulb, Loader2, NotebookPen, Plus, Shapes, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RichEditor } from '@/components/editor/rich-editor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDeleteTheme, useSaveTheme, useThemes } from '@/data/queries'
import { sortThemes, themeHasContent, themePreview, type Theme } from '@/domain/themes'
import { uuid } from '@/lib/storage'
import { cn, formatRelative } from '@/lib/utils'

const AUTOSAVE_MS = 800

/**
 * Temas do assunto: cartões em lista, cada um com o seu resumo e pontos
 * importantes. Clicar no cartão abre a caixa de edição; tudo é salvo
 * automaticamente.
 */
export function TopicThemes({ topicId }: { topicId: string }) {
  const query = useThemes()
  const saveTheme = useSaveTheme()
  const deleteTheme = useDeleteTheme()
  const themes = useMemo(() => sortThemes((query.data ?? []).filter((t) => t.topicId === topicId)), [query.data, topicId])
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Theme | null>(null)

  const create = () => {
    const title = newTitle.trim()
    if (!title) return
    const now = new Date().toISOString()
    const theme: Theme = { id: uuid(), topicId, title, summary: '', keyPoints: '', order: (themes.at(-1)?.order ?? -1) + 1, createdAt: now, updatedAt: now }
    saveTheme.mutate(theme, { onError: () => toast.error('Não foi possível criar o tema.') })
    setNewTitle('')
    setAdding(false)
    setOpenId(theme.id)
  }

  // Troca a posição com o vizinho
  const move = (theme: Theme, dir: -1 | 1) => {
    const i = themes.findIndex((t) => t.id === theme.id)
    const other = themes[i + dir]
    if (!other) return
    saveTheme.mutate({ ...theme, order: other.order })
    saveTheme.mutate({ ...other, order: theme.order === other.order ? theme.order - dir : theme.order })
  }

  return (
    <section aria-labelledby="section-themes" className="pt-1">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Shapes className="size-4 text-primary dark:text-primary-soft" aria-hidden />
        <h2 id="section-themes" className="font-bold tracking-tight">
          Temas do assunto
        </h2>
        {themes.length > 0 && <span className="rounded-full bg-primary-tint px-2 py-px text-xs font-bold text-primary tabular-nums dark:text-primary-soft">{themes.length}</span>}
        <p className="hidden min-w-0 flex-1 truncate text-xs text-muted sm:block">Divida o assunto em temas, cada um com resumo e pontos importantes.</p>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setAdding(true)}>
          <Plus /> Adicionar tema
        </Button>
      </div>

      <div className="space-y-3">
        {themes.length === 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted transition hover:border-primary/50 hover:bg-primary-tint/30"
          >
            <span className="font-semibold text-foreground">Nenhum tema ainda</span>
            Ex.: em “Poder constituinte”, crie os temas Originário, Reformador, Decorrente e Revisor.
          </button>
        )}

        {themes.map((theme, i) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            index={i}
            open={openId === theme.id}
            onToggle={() => setOpenId((id) => (id === theme.id ? null : theme.id))}
            onSave={(t) => saveTheme.mutateAsync(t)}
            onMove={(dir) => move(theme, dir)}
            canMoveUp={i > 0}
            canMoveDown={i < themes.length - 1}
            onDelete={() => (themeHasContent(theme) ? setConfirmDelete(theme) : deleteTheme.mutate({ topicId, themeId: theme.id }))}
          />
        ))}

        {adding && (
          <form
            className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-surface p-3 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault()
              create()
            }}
          >
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nome do tema (ex.: Poder Constituinte Originário)"
              aria-label="Nome do novo tema"
              className="flex-1"
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={!newTitle.trim()}>
                <Plus /> Criar tema
              </Button>
            </div>
          </form>
        )}
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Excluir tema?</DialogTitle>
          <DialogDescription>O resumo e os pontos importantes de “{confirmDelete?.title}” serão apagados.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90"
              onClick={() => {
                if (confirmDelete) deleteTheme.mutate({ topicId, themeId: confirmDelete.id })
                toast('Tema excluído')
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

type Draft = Pick<Theme, 'title' | 'summary' | 'keyPoints'>
const sameDraft = (a: Draft, b: Draft) => a.title === b.title && a.summary === b.summary && a.keyPoints === b.keyPoints

function ThemeCard({
  theme,
  index,
  open,
  onToggle,
  onSave,
  onMove,
  canMoveUp,
  canMoveDown,
  onDelete,
}: {
  theme: Theme
  index: number
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
  const pending = !sameDraft(draft, theme)

  return (
    <article className={cn('overflow-hidden rounded-2xl border bg-surface transition', open ? 'border-primary/40 shadow-soft' : 'border-border hover:border-primary/30')}>
      <button
        type="button"
        onClick={() => {
          if (open) flush()
          onToggle()
        }}
        aria-expanded={open}
        aria-controls={`theme-${theme.id}`}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-tint text-sm font-extrabold text-primary tabular-nums dark:text-primary-soft">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug">{draft.title.trim() || theme.title}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">{preview || 'Clique para escrever o resumo deste tema.'}</span>
        </span>
        <span className="hidden shrink-0 pt-1 text-xs text-subtle sm:block">{formatRelative(theme.updatedAt)}</span>
        <ChevronDown className={cn('mt-1 size-5 shrink-0 text-muted transition', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div id={`theme-${theme.id}`} className="space-y-4 border-t border-border bg-background/40 px-4 py-4 sm:px-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Nome do tema</span>
            <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} aria-label="Nome do tema" />
          </label>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <NotebookPen className="size-4 text-primary dark:text-primary-soft" aria-hidden /> Resumo do tema
            </p>
            <RichEditor
              value={draft.summary}
              onChange={(html) => setDraft((d) => ({ ...d, summary: html }))}
              placeholder="O essencial deste tema com suas palavras…"
              ariaLabel={`Resumo do tema ${theme.title}`}
              minHeight={160}
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
              ariaLabel={`Pontos importantes do tema ${theme.title}`}
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
            <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="Mover tema para cima">
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="Mover tema para baixo">
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-tint hover:text-danger" onClick={onDelete}>
              <Trash2 /> Excluir tema
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}
