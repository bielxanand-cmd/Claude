import { useSyncExternalStore } from 'react'
import { toBookPages, type BookPage } from '@/domain/book'
import { extractPdfText, PdfReadError } from '@/features/import/pdf-text'

/**
 * Livro carregado nesta sessão. Fica só na memória (um livro inteiro não cabe
 * nos limites de armazenamento da conta) — basta enviar de novo em outra visita.
 */
export interface LoadedBook {
  name: string
  pages: BookPage[]
}

let book: LoadedBook | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function useLoadedBook(): LoadedBook | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => book,
  )
}

export function clearBook() {
  book = null
  emit()
}

export async function loadBook(file: File, onProgress?: (page: number, total: number) => void): Promise<LoadedBook> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new PdfReadError('Envie um arquivo PDF.', 'invalid')
  const { pages } = await extractPdfText(file, onProgress)
  book = { name: file.name.replace(/\.pdf$/i, ''), pages: toBookPages(pages) }
  emit()
  return book
}
