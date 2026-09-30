import { toast } from 'sonner'
import { getFileStore, readFile } from '@/data/files'
import type { Attachment } from '@/domain/attachments'
import { saveFile } from '@/lib/save-file'

/** Baixa o arquivo de um anexo (no claude.ai, pela confirmação de download). */
export async function downloadAttachment(item: Attachment) {
  try {
    const store = await getFileStore()
    if (!store) throw new Error('sem armazenamento')
    const result = await saveFile(item.name, await readFile(store, item.blobId))
    if (result === 'failed') toast.error('Não foi possível baixar o arquivo nesta página.')
  } catch {
    toast.error('Arquivo não encontrado', { description: 'Ele pode ter sido salvo só em outro navegador.' })
  }
}

