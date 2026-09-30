import { useEffect, useState } from 'react'

/**
 * Salvar arquivos gerados pelo app. No navegador comum, um download normal;
 * na página publicada no claude.ai, a capacidade `downloads` (o usuário
 * confirma o arquivo antes de salvar).
 */
type Downloads = { save(request: { filename: string; data: Blob | string }): Promise<{ status: 'saved' | 'delivered' }> }

const EMBEDDED = import.meta.env.VITE_MEMORY_ROUTER === 'true'
let downloadsPromise: Promise<Downloads | null> | null = null

function loadDownloads(): Promise<Downloads | null> {
  if (!EMBEDDED) return Promise.resolve(null)
  const claude = (globalThis as { claude?: { use(name: 'downloads'): Promise<Downloads | null> } }).claude
  if (!claude?.use) return Promise.resolve(null)
  return (downloadsPromise ??= claude.use('downloads').catch(() => null))
}

/** `true` quando dá para oferecer downloads nesta página. */
export function useCanSaveFiles(): boolean {
  const [can, setCan] = useState(!EMBEDDED)
  useEffect(() => {
    if (!EMBEDDED) return
    let alive = true
    void loadDownloads().then((d) => alive && setCan(!!d))
    return () => {
      alive = false
    }
  }, [])
  return can
}

export type SaveResult = 'saved' | 'declined' | 'failed'

export async function saveFile(filename: string, data: Blob): Promise<SaveResult> {
  if (EMBEDDED) {
    const downloads = await loadDownloads()
    if (!downloads) return 'failed'
    try {
      await downloads.save({ filename, data })
      return 'saved'
    } catch (e) {
      return (e as { code?: string })?.code === 'declined' ? 'declined' : 'failed'
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(data)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return 'saved'
}
