import { Download, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { getFileStore, readFile } from '@/data/files'
import { attachmentKind, formatSize, type Attachment } from '@/domain/attachments'
import { openPdf } from '@/features/import/pdf-text'
import { useCanSaveFiles } from '@/lib/save-file'
import { downloadAttachment } from './download'

/** Visualiza um anexo: PDF página a página, imagem, vídeo ou texto. */
export function AttachmentViewer({ item, onOpenChange }: { item: Attachment | null; onOpenChange: (open: boolean) => void }) {
  const canSave = useCanSaveFiles()
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        {item && (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 pr-14 sm:px-6">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate">{item.name}</DialogTitle>
                <DialogDescription>{formatSize(item.size)}</DialogDescription>
              </div>
              {canSave && (
                <Button variant="outline" size="sm" onClick={() => downloadAttachment(item)}>
                  <Download /> Baixar
                </Button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#F4F4F6] p-3 sm:p-5">
              <Preview key={item.id} item={item} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Preview({ item }: { item: Attachment }) {
  const kind = attachmentKind(item.type)
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null
    void (async () => {
      try {
        const store = await getFileStore()
        if (!store) throw new Error('sem armazenamento')
        if (kind === 'text') {
          const blob = await readFile(store, item.blobId)
          if (alive) setText(await blob.text())
        } else if (kind !== 'pdf') {
          // Endereço local do conteúdo (blob:), aceito pela política de segurança da página publicada
          const blob = await readFile(store, item.blobId)
          objectUrl = URL.createObjectURL(blob)
          if (alive) setUrl(objectUrl)
        }
      } catch {
        if (alive) setError('Arquivo não encontrado. Ele pode ter sido salvo só em outro navegador.')
      }
    })()
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [item, kind])

  if (error) return <p className="rounded-xl bg-surface p-6 text-center text-sm text-muted">{error}</p>
  if (kind === 'pdf') return <PdfPages item={item} />
  if (kind === 'text')
    return text === null ? <Spinner /> : <pre className="rounded-xl bg-surface p-5 text-sm whitespace-pre-wrap">{text}</pre>
  if (!url) return <Spinner />
  if (kind === 'video') return <video src={url} controls className="mx-auto max-h-full max-w-full rounded-xl bg-black" />
  return <img src={url} alt={item.name} className="mx-auto h-auto max-w-full rounded-xl bg-white shadow-soft" />
}

const Spinner = () => (
  <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
    <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando…
  </p>
)

/** PDF desenhado página a página (funciona também onde o navegador não abre PDFs em quadro). */
function PdfPages({ item }: { item: Attachment }) {
  const container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let destroy: (() => void) | null = null
    void (async () => {
      try {
        const store = await getFileStore()
        if (!store) throw new Error('sem armazenamento')
        const data = new Uint8Array(await (await readFile(store, item.blobId)).arrayBuffer())
        if (cancelled) return
        const pdf = await openPdf(data)
        // Fechou (ou abriu outro) enquanto carregava: descarta
        if (cancelled) return pdf.destroy()
        destroy = pdf.destroy
        const total = pdf.doc.numPages
        setStatus({ done: 0, total })
        const el = container.current
        if (!el) return
        el.replaceChildren()
        const width = Math.min(el.clientWidth || 800, 1000)
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        for (let n = 1; n <= total && !cancelled; n++) {
          const page = await pdf.doc.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.width = `${Math.floor(viewport.width / ratio)}px`
          canvas.setAttribute('aria-label', `Página ${n} de ${total}`)
          canvas.className = 'mx-auto mb-3 block max-w-full rounded-lg bg-white shadow-soft'
          el.appendChild(canvas)
          await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
          if (cancelled) return
          if (!cancelled) setStatus({ done: n, total })
        }
      } catch (err) {
        console.warn('[anexo] falha ao abrir o PDF', err)
        if (!cancelled) setError('Não foi possível abrir este PDF.')
      }
    })()
    return () => {
      cancelled = true
      destroy?.()
    }
  }, [item])

  if (error) return <p className="rounded-xl bg-surface p-6 text-center text-sm text-muted">{error}</p>
  return (
    <>
      {(!status || status.done < status.total) && (
        <p className="mb-3 flex items-center justify-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {status ? `Carregando páginas… ${status.done} de ${status.total}` : 'Abrindo PDF…'}
        </p>
      )}
      <div ref={container} />
    </>
  )
}
