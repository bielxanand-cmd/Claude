import { Check, ChevronDown, Filter, Loader2, NotebookPen, Plus, Trash2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RichEditor } from '@/components/editor/rich-editor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useDeleteQuestionNote, useQuestionNotes, useSaveQuestionNote } from '@/data/queries'
import { filterNotes, notePreview, sortNotes, type NoteFilter, type QuestionNote } from '@/domain/question-notes'
import { rootThemes, subthemesOf, type Theme } from '@/domain/themes'
import { uuid } from '@/lib/storage'
import { htmlToText } from '@/lib/text'
import { cn, formatRelative } from '@/lib/utils'

const AUTOSAVE_MS = 800
const SELECT = 'h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm disabled:opacity-60'

const filterKey = (f: NoteFilter) => (f.kind === 'theme' ? `t:${f.themeId}` : f.kind === 'subtheme' ? `s:${f.subthemeId}` : f.kind)
function parseFilter(key: string): NoteFilter {
  if (key.startsWith('t:')) return { kind: 'theme', themeId: key.slice(2) }
  if (key.startsWith('s:')) return { kind: 'subtheme', subthemeId: key.slice(2) }
  return key === 'none' ? { kind: 'none' } : { kind: 'all' }
}

/**
 * Questões do assunto: caderno de erros. Cada anotação é um campo aberto
 * (enunciado, o que marcou, a resposta certa, por que errou), marcado com
 * tema e subtema para filtrar depois. Salva automaticamente.
 */
export function QuestionNotes({ topicId, themes }: { topicId: string; themes: Theme[] }) {
  const query = useQuestionNotes()
  const saveNote = useSaveQuestionNote()
  const deleteNote = useDeleteQuestionNote()
  const notes = useMemo(() => sortNotes((query.data ?? []).filter((n) => n.topicId === topicId)), [query.data, topicId])
  const roots = useMemo(() => rootThemes(themes), [themes])
  const [filter, setFilter] = useState<NoteFilter>({ kind: 'all' })
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<QuestionNote | null>(null)

  // Filtro de um tema/subtema que foi excluído volta para "Todas"
  const validFilter: NoteFilter =
    (filter.kind === 'theme' && !themes.some((t) => t.id === filter.themeId)) || (filter.kind === 'subtheme' && !themes.some((t) => t.id === filter.subthemeId))
      ? { kind: 'all' }
      : filter
  const visible = filterNotes(notes, validFilter)
  const count = (f: NoteFilter) => filterNotes(notes, f).length

  const add = () => {
    const now = new Date().toISOString()
    const sub = validFilter.kind === 'subtheme' ? themes.find((t) => t.id === validFilter.subthemeId) : undefined
    const note: QuestionNote = {
      id: uuid(),
      topicId,
      themeId: validFilter.kind === 'theme' ? validFilter.themeId : (sub?.parentId ?? null),
      subthemeId: sub?.id ?? null,
      html: '',
      createdAt: now,
      updatedAt: now,
    }
    saveNote.mutate(note, { onError: () => toast.error('Não foi possível criar a anotação.') })
    setOpenIds((prev) => new Set(prev).add(note.id))
  }

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section aria-labelledby="section-question-notes" className="pt-1">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <XCircle className="size-4 text-primary dark:text-primary-soft" aria-hidden />
        <h2 id="section-question-notes" className="font-bold tracking-tight">
          Questões
        </h2>
        {notes.length > 0 && <span className="rounded-full bg-primary-tint px-2 py-px text-xs font-bold text-primary tabular-nums dark:text-primary-soft">{notes.length}</span>}
        <p className="hidden min-w-0 flex-1 truncate text-xs text-muted sm:block">Anote as questões que você errou: o que cobrava, o que marcou e por que errou.</p>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={add}>
          <Plus /> Adicionar questão
        </Button>
      </div>

      {notes.length > 0 && (
        <label className="mb-3 flex items-center gap-2 text-sm">
          <Filter className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="sr-only">Filtrar questões por tema e subtema</span>
          <select className={cn(SELECT, 'sm:max-w-sm')} value={filterKey(validFilter)} onChange={(e) => setFilter(parseFilter(e.target.value))} aria-label="Filtrar questões por tema e subtema">
            <option value="all">Todas as questões ({notes.length})</option>
            {roots.map((theme) => (
              <optgroup key={theme.id} label={theme.title}>
                <option value={`t:${theme.id}`}>
                  {theme.title} — todo o tema ({count({ kind: 'theme', themeId: theme.id })})
                </option>
                {subthemesOf(themes, theme.id).map((sub) => (
                  <option key={sub.id} value={`s:${sub.id}`}>
                    ↳ {sub.title} ({count({ kind: 'subtheme', subthemeId: sub.id })})
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="none">Sem tema ({count({ kind: 'none' })})</option>
          </select>
        </label>
      )}

      <div className="space-y-3">
        {notes.length === 0 ? (
          <button
            type="button"
            onClick={add}
            className="flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted transition hover:border-primary/50 hover:bg-primary-tint/30"
          >
            <span className="font-semibold text-foreground">Nenhuma questão anotada</span>
            Errou uma questão? Anote aqui e marque o tema e o subtema para revisar depois.
          </button>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong px-4 py-5 text-center text-sm text-muted">Nenhuma questão com este filtro.</p>
        ) : (
          visible.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              themes={themes}
              open={openIds.has(note.id)}
              onToggle={() => toggle(note.id)}
              onSave={(n) => saveNote.mutateAsync(n)}
              onDelete={() => (htmlToText(note.html) ? setConfirmDelete(note) : deleteNote.mutate({ topicId, noteId: note.id }))}
            />
          ))
        )}
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Excluir anotação?</DialogTitle>
          <DialogDescription>O texto desta questão será apagado.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90"
              onClick={() => {
                if (confirmDelete) deleteNote.mutate({ topicId, noteId: confirmDelete.id })
                toast('Anotação excluída')
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

type Draft = Pick<QuestionNote, 'themeId' | 'subthemeId' | 'html'>
const pickDraft = (n: QuestionNote): Draft => ({ themeId: n.themeId, subthemeId: n.subthemeId, html: n.html })
const sameDraft = (a: Draft, b: Draft) => a.themeId === b.themeId && a.subthemeId === b.subthemeId && a.html === b.html

function NoteCard({
  note,
  themes,
  open,
  onToggle,
  onSave,
  onDelete,
}: {
  note: QuestionNote
  themes: Theme[]
  open: boolean
  onToggle: () => void
  onSave: (note: QuestionNote) => Promise<QuestionNote>
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => pickDraft(note))
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const base = useRef<Draft>(pickDraft(note))
  const latest = useRef({ draft, note, onSave })
  useEffect(() => {
    latest.current = { draft, note, onSave }
  })

  // Alterada em outro aparelho: atualiza se não há edição pendente aqui
  useEffect(() => {
    const remote = pickDraft(note)
    if (sameDraft(remote, base.current)) return
    if (sameDraft(latest.current.draft, base.current)) setDraft(remote)
    base.current = remote
  }, [note])

  const flush = () => {
    const { draft: d, note: n, onSave: save } = latest.current
    if (sameDraft(d, base.current)) return
    base.current = d
    setState('saving')
    save({ ...n, ...d })
      .then(() => setState('idle'))
      .catch(() => {
        setState('error')
        toast.error('Não foi possível salvar a anotação.')
      })
  }

  useEffect(() => {
    if (sameDraft(draft, base.current)) return
    const id = setTimeout(flush, AUTOSAVE_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roots = rootThemes(themes)
  const theme = themes.find((t) => t.id === draft.themeId)
  const sub = themes.find((t) => t.id === draft.subthemeId)
  const subs = theme ? subthemesOf(themes, theme.id) : []
  const preview = notePreview({ ...note, ...draft })
  const pending = !sameDraft(draft, base.current)

  return (
    <article className={cn('overflow-hidden rounded-2xl border bg-surface transition', open ? 'border-primary/40 shadow-soft' : 'border-border hover:border-primary/30')}>
      <button
        type="button"
        onClick={() => {
          if (open) flush()
          onToggle()
        }}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-danger-tint text-danger">
          <XCircle className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            {theme ? (
              <span className="rounded-full bg-primary-tint px-2 py-0.5 text-xs font-semibold text-primary dark:text-primary-soft">
                {theme.title}
                {sub && ` › ${sub.title}`}
              </span>
            ) : (
              <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-xs font-semibold text-muted">Sem tema</span>
            )}
          </span>
          <span className={cn('mt-1 block text-sm', preview ? 'line-clamp-2 text-foreground' : 'text-muted')}>{preview || 'Clique para escrever sobre a questão.'}</span>
        </span>
        <span className="hidden shrink-0 pt-1 text-xs text-subtle sm:block">{formatRelative(note.createdAt)}</span>
        <ChevronDown className={cn('mt-1 size-5 shrink-0 text-muted transition', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border bg-background/40 px-4 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Tema</span>
              <select
                className={SELECT}
                value={draft.themeId ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, themeId: e.target.value || null, subthemeId: null }))}
                aria-label="Tema da questão"
              >
                <option value="">Sem tema</option>
                {roots.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Subtema</span>
              <select
                className={SELECT}
                value={draft.subthemeId ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, subthemeId: e.target.value || null }))}
                disabled={subs.length === 0}
                aria-label="Subtema da questão"
              >
                <option value="">{!theme ? 'Escolha um tema primeiro' : subs.length ? 'Sem subtema' : 'Este tema não tem subtemas'}</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <NotebookPen className="size-4 text-primary dark:text-primary-soft" aria-hidden /> Anotação da questão
            </p>
            <RichEditor
              value={draft.html}
              onChange={(html) => setDraft((d) => ({ ...d, html }))}
              placeholder="Enunciado (ou o essencial dele), o que você marcou, a resposta certa e por que errou…"
              ariaLabel="Anotação da questão"
              minHeight={140}
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
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-tint hover:text-danger" onClick={onDelete}>
              <Trash2 /> Excluir questão
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}
