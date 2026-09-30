/**
 * Anexos de um assunto (PDFs, imagens, vídeos e textos). O arquivo fica no
 * armazenamento de arquivos; aqui fica só a ficha que aponta para ele.
 */
export interface Attachment {
  id: string
  topicId: string
  name: string
  /** Tipo MIME com que o arquivo foi guardado */
  type: string
  size: number
  /** Identificador do arquivo no armazenamento */
  blobId: string
  createdAt: string
}

export type AttachmentKind = 'pdf' | 'image' | 'video' | 'text'

/** Tipos aceitos (os mesmos que a página publicada no claude.ai guarda). */
const BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
}
const ACCEPTED = new Set(Object.values(BY_EXTENSION))

export const ACCEPT_ATTRIBUTE = [...new Set([...Object.keys(BY_EXTENSION).map((e) => `.${e}`), ...ACCEPTED])].join(',')

/** 20 MB por arquivo (SVG: 2 MB) */
export const maxSizeFor = (type: string) => (type === 'image/svg+xml' ? 2 : 20) * 1024 * 1024

/** Tipo aceito para o arquivo (pela extensão quando o navegador não informa), ou `null`. */
export function attachmentType(name: string, browserType: string): string | null {
  const bare = browserType.split(';')[0].trim().toLowerCase()
  if (ACCEPTED.has(bare)) return bare
  const ext = name.toLowerCase().split('.').pop() ?? ''
  return BY_EXTENSION[ext] ?? null
}

export function attachmentKind(type: string): AttachmentKind {
  if (type === 'application/pdf') return 'pdf'
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  return 'text'
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}
