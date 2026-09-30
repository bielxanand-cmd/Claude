import { Sparkles, Wand2 } from 'lucide-react'
import { findRelevantPages, pageRangeLabel } from '@/domain/book'
import { cn } from '@/lib/utils'
import type { LoadedBook } from '@/features/book/book-store'

export type AssistantMode = 'ai' | 'auto'

/** Escolha entre o Claude e a versão automática (sem IA). */
export function ModePicker({
  mode,
  onChange,
  aiAvailable,
  aiHint,
  autoHint,
  disabled,
}: {
  mode: AssistantMode
  onChange: (mode: AssistantMode) => void
  aiAvailable: boolean
  aiHint: string
  autoHint: string
  disabled?: boolean
}) {
  if (!aiAvailable)
    return <p className="rounded-xl bg-foreground/[0.04] px-4 py-3 text-xs text-muted">{autoHint} Com o Claude (disponível na página publicada no claude.ai) o resultado fica mais completo.</p>
  return (
    <div role="radiogroup" aria-label="Como gerar" className="grid gap-2 sm:grid-cols-2">
      {(
        [
          ['ai', 'Com o Claude', aiHint, Sparkles],
          ['auto', 'Automático (sem IA)', autoHint, Wand2],
        ] as const
      ).map(([value, title, hint, Icon]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          disabled={disabled}
          onClick={() => onChange(value)}
          className={cn('rounded-xl border p-3 text-left transition', mode === value ? 'border-primary bg-primary-tint ring-4 ring-ring/15' : 'border-border hover:border-border-strong')}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon className="size-3.5 text-primary" aria-hidden /> {title}
          </span>
          <span className="mt-0.5 block text-xs text-muted">{hint}</span>
        </button>
      ))}
    </div>
  )
}

/** HTML já higienizado, com o mesmo estilo do editor. */
export function HtmlPreview({ html, className }: { html: string; className?: string }) {
  return <div className={cn('rich-content rounded-xl border border-border bg-surface p-4 sm:p-5', className)} dangerouslySetInnerHTML={{ __html: html }} />
}

/** Trecho do livro carregado sobre o assunto (texto corrido), se houver. */
export function bookExcerptFor(book: LoadedBook | null, topicName: string, details: string[]) {
  if (!book) return null
  const excerpt = findRelevantPages(book.pages, topicName, details)
  if (!excerpt) return null
  return { excerpt, text: excerpt.pages.map((p) => `[p. ${p.number}] ${p.text}`).join('\n'), label: `${book.name}, ${pageRangeLabel(excerpt)}` }
}
