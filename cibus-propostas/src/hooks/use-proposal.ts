import { useCallback, useEffect, useRef, useState } from 'react'
import { produce, type Draft } from 'immer'
import { toast } from 'sonner'
import { useAppData } from '@/lib/app-data'
import { repo } from '@/lib/repo'
import { normalizeProposal } from '@/lib/templates'
import type { Proposal } from '@/lib/types'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

/** Carrega uma proposta e mantém um rascunho com salvamento automático. */
export function useProposal(id: string | undefined) {
  const { settings, modules, executives, ready } = useAppData()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const latest = useRef<Proposal | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<Promise<void> | null>(null)
  const dirty = useRef(false)

  useEffect(() => {
    if (!id || !ready) return
    let alive = true
    repo
      .getProposal(id)
      .then((p) => {
        if (!alive) return
        if (!p) return setNotFound(true)
        const exec = executives.find((e) => e.id === p.meta?.executiveId) ?? null
        const n = normalizeProposal(p, { settings, modules, executive: exec })
        latest.current = n
        setProposal(n)
      })
      .catch((e) => toast.error(`Erro ao carregar a proposta: ${e.message}`))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ready])

  const persist = useCallback(async () => {
    window.clearTimeout(timer.current)
    const p = latest.current
    if (!p) return
    dirty.current = false
    setSaveState('saving')
    const run = (async () => {
      try {
        await pending.current // evita gravações fora de ordem
        const stamped = { ...p, updatedAt: new Date().toISOString() }
        await repo.saveProposal(stamped)
        if (latest.current === p) setSaveState('saved')
      } catch (e) {
        setSaveState('error')
        toast.error(`Não foi possível salvar: ${(e as Error).message}`)
      }
    })()
    pending.current = run
    return run
  }, [])

  const update = useCallback(
    (fn: (d: Draft<Proposal>) => void) => {
      setProposal((prev) => {
        if (!prev) return prev
        const next = produce(prev, fn)
        latest.current = next
        return next
      })
      dirty.current = true
      setSaveState('dirty')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(persist, 900)
    },
    [persist],
  )

  // salva ao sair da página
  useEffect(() => {
    const flush = () => {
      if (dirty.current) persist()
    }
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [persist])

  return { proposal, update, save: persist, saveState, notFound }
}
