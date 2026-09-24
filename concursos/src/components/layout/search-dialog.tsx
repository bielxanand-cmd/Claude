import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CornerDownLeft, Search, SearchX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconTile } from '@/components/study/icon-registry'
import { usePositions, useStudy } from '@/data/queries'
import { globalSearch, SEARCH_GROUP_LABEL, type SearchResult } from '@/domain/search'
import { cn } from '@/lib/utils'

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
  const { plan, summaries } = useStudy()
  const positions = usePositions({}, open)

  const results = useMemo(
    () => globalSearch(query, { plan, summaries, positions: positions.data ?? [] }),
    [query, plan, summaries, positions.data],
  )

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery('')
      setActive(0)
    }
    onOpenChange(next)
  }
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (result: SearchResult) => {
    handleOpenChange(false)
    navigate(result.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active])
    }
  }

  let lastKind: SearchResult['kind'] | null = null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-[fade-in_150ms_ease-out]" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-3 z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-pop outline-none animate-[fade-in_180ms_ease-out] sm:top-[12vh]"
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Busca global</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Pesquise disciplinas, assuntos, resumos e cargos</DialogPrimitive.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-5 text-muted" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              placeholder="Pesquisar disciplinas, assuntos, resumos, cargos…"
              aria-label="Pesquisar"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={results[active] ? `search-${active}` : undefined}
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
            />
            <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted sm:block">ESC</kbd>
          </div>

          <div ref={listRef} id="search-results" role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">Digite ao menos 2 letras. Ex.: “crédito”, “crase”, “auditor”.</p>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center px-3 py-10 text-center">
                <SearchX className="size-8 text-subtle" aria-hidden />
                <p className="mt-2 text-sm font-semibold">Nada encontrado para “{query}”</p>
                <p className="text-sm text-muted">Tente outro termo.</p>
              </div>
            ) : (
              results.map((result, index) => {
                const header = result.kind !== lastKind ? SEARCH_GROUP_LABEL[result.kind] : null
                lastKind = result.kind
                return (
                  <div key={`${result.kind}-${result.id}`}>
                    {header && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-subtle">{header}</p>}
                    <button
                      id={`search-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(result)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        index === active && 'bg-primary-tint',
                      )}
                    >
                      <IconTile icon={result.icon} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{result.title}</span>
                        <span className="block truncate text-xs text-muted">{result.subtitle}</span>
                      </span>
                      {index === active && <CornerDownLeft className="size-4 text-primary" aria-hidden />}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
