import { Download, FileText, Film, Image as ImageIcon, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FileStoreError, getFileStore } from '@/data/files'
import { useAttachments, useDeleteAttachment, useSaveAttachment } from '@/data/queries'
import { ACCEPT_ATTRIBUTE, attachmentKind, attachmentType, formatSize, maxSizeFor, type Attachment } from '@/domain/attachments'
import { uuid } from '@/lib/storage'
import { useCanSaveFiles } from '@/lib/save-file'
import { cn, formatRelative } from '@/lib/utils'
import { AttachmentViewer } from './attachment-viewer'
import { downloadAttachment } from './download'

const KIND_ICON = { pdf: FileText, image: ImageIcon, video: Film, text: FileText } as const

function uploadError(e: unknown): string {
  const code = e instanceof FileStoreError ? e.code : ''
  switch (code) {
    case 'too_large':
      return 'Arquivo grande demais (máximo de 20 MB).'
    case 'unsupported_type':
      return 'Tipo de arquivo não aceito.'
    case 'quota_or_state':
      return 'Sem espaço para mais anexos. Exclua alguns e tente de novo.'
    case 'rate_limited':
      return 'Muitos envios seguidos. Aguarde um pouco e tente de novo.'
    case 'not_granted':
      return 'Você não autorizou o envio de arquivos nesta página.'
    default:
      return 'Não foi possível salvar o arquivo. Tente de novo.'
  }
}

/** Anexos do assunto (coluna lateral): enviar, ver, baixar e excluir. */
export function TopicAttachments({ topicId }: { topicId: string }) {
  const query = useAttachments()
  const saveAttachment = useSaveAttachment()
  const deleteAttachment = useDeleteAttachment()
  const canSave = useCanSaveFiles()
  const items = useMemo(
    () => (query.data ?? []).filter((a) => a.topicId === topicId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [query.data, topicId],
  )
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [viewing, setViewing] = useState<Attachment | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Attachment | null>(null)

  const upload = async (fileList: FileList | File[]) => {
    // Copia antes de qualquer espera: o FileList do campo é esvaziado logo depois
    const files = Array.from(fileList)
    const store = await getFileStore()
    if (!store) {
      toast.error('Este navegador não permite guardar arquivos.')
      return
    }
    for (const file of files) {
      const type = attachmentType(file.name, file.type)
      if (!type) {
        toast.error(`“${file.name}” não é aceito`, { description: 'Use PDF, imagem (JPEG, PNG, GIF, WEBP), vídeo (MP4, WEBM) ou texto.' })
        continue
      }
      if (file.size > maxSizeFor(type)) {
        toast.error(`“${file.name}” é grande demais`, { description: `O máximo é ${formatSize(maxSizeFor(type))} por arquivo.` })
        continue
      }
      setUploading(file.name)
      try {
        const blobId = await store.put(file, type)
        saveAttachment.mutate(
          { id: uuid(), topicId, name: file.name, type, size: file.size, blobId, createdAt: new Date().toISOString() },
          { onError: () => toast.error('Não foi possível salvar o anexo.') },
        )
        toast.success('Anexo salvo', { description: file.name })
      } catch (e) {
        toast.error(`“${file.name}”: ${uploadError(e)}`)
      } finally {
        setUploading(null)
      }
    }
  }

  const remove = async (item: Attachment) => {
    deleteAttachment.mutate({ topicId, attachmentId: item.id })
    try {
      await (await getFileStore())?.remove(item.blobId)
    } catch {
      // A ficha já foi removida; o arquivo órfão não aparece em lugar nenhum
    }
    toast('Anexo excluído', { description: item.name })
  }

  return (
    <Card
      className={cn('overflow-hidden transition', dragging && 'ring-2 ring-primary')}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files.length) void upload(e.dataTransfer.files)
      }}
    >
      <section aria-labelledby="attachments-title">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Paperclip className="size-4 text-primary dark:text-primary-soft" aria-hidden />
          <h2 id="attachments-title" className="text-sm font-bold">
            Anexos
          </h2>
          {items.length > 0 && <span className="rounded-full bg-primary-tint px-2 py-px text-xs font-bold text-primary tabular-nums dark:text-primary-soft">{items.length}</span>}
          <Button size="sm" variant="secondary" className="ml-auto" onClick={() => input.current?.click()} disabled={!!uploading}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Adicionar
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            aria-label="Adicionar anexos ao assunto"
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <div className="p-2">
          {uploading && (
            <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted" role="status">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Enviando “{uploading}”…
            </p>
          )}
          {items.length === 0 && !uploading ? (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="w-full rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-xs text-muted transition hover:border-primary/50 hover:bg-primary-tint/30"
            >
              <span className="block text-sm font-semibold text-foreground">Nenhum anexo</span>
              Guarde PDFs, imagens e outros arquivos deste assunto. Clique ou arraste aqui.
            </button>
          ) : (
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = KIND_ICON[attachmentKind(item.type)]
                return (
                  <li key={item.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-foreground/[0.03]">
                    <button
                      type="button"
                      onClick={() => setViewing(item)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      title={item.name}
                      aria-label={`Ver ${item.name}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary dark:text-primary-soft">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm leading-snug font-semibold break-words">{item.name}</span>
                        <span className="block text-xs text-subtle">
                          {formatSize(item.size)} · {formatRelative(item.createdAt)}
                        </span>
                      </span>
                    </button>
                    {canSave && (
                      <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => downloadAttachment(item)} aria-label={`Baixar ${item.name}`}>
                        <Download />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" className="shrink-0 hover:text-danger" onClick={() => setConfirmDelete(item)} aria-label={`Excluir ${item.name}`}>
                      <Trash2 />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <AttachmentViewer item={viewing} onOpenChange={(open) => !open && setViewing(null)} />

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Excluir anexo?</DialogTitle>
          <DialogDescription>“{confirmDelete?.name}” será apagado deste assunto.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-danger hover:bg-danger/90"
              onClick={() => {
                if (confirmDelete) void remove(confirmDelete)
                setConfirmDelete(null)
              }}
            >
              <Trash2 /> Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
