import { Cloud, CloudOff, HardDrive, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useSyncStatus } from '@/data/persistence/status'
import { dataSource } from '@/data/sources'
import { cn } from '@/lib/utils'

/** Avisa na tela quando uma gravação falha (usar uma vez, no layout). */
export function useSyncWarnings() {
  const sync = useSyncStatus()
  const warned = useRef<string | null>(null)

  useEffect(() => {
    if (sync.state === 'error' && sync.message && warned.current !== sync.message) {
      warned.current = sync.message
      toast.error(sync.message)
    }
    if (sync.state !== 'error') warned.current = null
  }, [sync.state, sync.message])
}

/** Mostra onde os dados estão sendo salvos. */
export function SyncIndicator({ className }: { className?: string }) {
  const sync = useSyncStatus()

  if (dataSource.kind === 'supabase' || sync.where === 'loading') return null
  const Icon = sync.state === 'saving' ? Loader2 : sync.state === 'error' ? CloudOff : sync.where === 'cloud' ? Cloud : HardDrive
  const label =
    sync.state === 'saving'
      ? 'Salvando…'
      : sync.state === 'error'
        ? 'Falha ao salvar — tentando de novo'
        : sync.where === 'cloud'
          ? 'Salvo na sua conta'
          : 'Salvo neste navegador'
  return (
    <p
      role="status"
      title={sync.where === 'browser' ? 'Os dados ficam só neste navegador. Limpar os dados do navegador apaga o progresso.' : undefined}
      className={cn('flex items-center gap-1.5 text-xs', sync.state === 'error' ? 'text-danger' : 'text-sidebar-muted', className)}
    >
      <Icon className={cn('size-3.5', sync.state === 'saving' && 'animate-spin')} aria-hidden />
      {label}
    </p>
  )
}
