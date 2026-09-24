import { BookOpen, FileUp, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { PdfReadError } from '@/features/import/pdf-text'
import { cn } from '@/lib/utils'
import { clearBook, loadBook, useLoadedBook } from './book-store'

/** Envio do livro/apostila em PDF (ou exibição do livro já carregado). */
export function BookUpload({ id }: { id: string }) {
  const book = useLoadedBook()
  const [reading, setReading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const read = async (file: File) => {
    setError(null)
    setReading('Abrindo o PDF…')
    try {
      await loadBook(file, (page, total) => setReading(`Lendo página ${page} de ${total}…`))
    } catch (err) {
      setError(err instanceof PdfReadError ? err.message : `Não foi possível ler o PDF (${err instanceof Error ? err.message : String(err)}).`)
    } finally {
      setReading(null)
    }
  }

  if (book && !reading)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success-tint px-4 py-3">
        <BookOpen className="size-5 shrink-0 text-success-strong" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{book.name}</p>
          <p className="text-xs text-muted">{book.pages.length} páginas carregadas nesta sessão</p>
        </div>
        <button type="button" onClick={clearBook} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-foreground/[0.06] hover:text-foreground">
          <X className="size-3.5" /> Trocar livro
        </button>
      </div>
    )

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file && !reading) void read(file)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
          dragging ? 'border-primary bg-primary-tint' : 'border-border-strong hover:border-primary/60 hover:bg-primary-tint/40',
          reading && 'pointer-events-none',
        )}
      >
        {reading ? (
          <>
            <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
            <p className="mt-3 text-sm font-semibold" aria-live="polite">
              {reading}
            </p>
          </>
        ) : (
          <>
            <FileUp className="size-7 text-primary" aria-hidden />
            <p className="mt-3 font-bold">Envie o livro ou a apostila em PDF</p>
            <p className="mt-1 text-sm text-muted">Arraste aqui ou clique para escolher. O arquivo é lido no seu navegador.</p>
          </>
        )}
        <input
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void read(file)
            e.target.value = ''
          }}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger-tint px-4 py-3 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
