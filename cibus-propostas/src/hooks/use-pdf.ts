import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { buildDeck } from '@/components/slides/slides'
import { useAppData } from '@/lib/app-data'
import { downloadBlob, exportDeckToPdf, pdfFileName } from '@/lib/pdf'
import type { Proposal } from '@/lib/types'

/** Gera e baixa o PDF de uma proposta, com progresso. */
export function usePdfExport() {
  const { settings, modules, cases } = useAppData()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const generate = useCallback(
    async (p: Proposal) => {
      const deck = buildDeck(p, { settings, modules, cases })
      setProgress({ done: 0, total: deck.length })
      const t = toast.loading('Gerando PDF…')
      try {
        const blob = await exportDeckToPdf(deck, {
          title: p.meta.title || 'Proposta Comercial Cibus',
          onProgress: (done, total) => {
            setProgress({ done, total })
            toast.loading(`Gerando PDF… página ${done} de ${total}`, { id: t })
          },
        })
        const name = pdfFileName(p)
        const saved = await downloadBlob(blob, name)
        if (saved) toast.success('PDF gerado com sucesso', { id: t, description: name })
        else toast.info('Download cancelado', { id: t })
        return blob
      } catch (e) {
        console.error(e)
        toast.error('Não foi possível gerar o PDF', { id: t, description: (e as Error).message })
        return null
      } finally {
        setProgress(null)
      }
    },
    [settings, modules, cases],
  )

  return { generate, progress, busy: progress !== null }
}
