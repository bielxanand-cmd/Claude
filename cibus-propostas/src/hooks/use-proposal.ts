import { useCallback, useEffect, useRef, useState } from 'react'
import { createStore, del, get, set } from 'idb-keyval'
import { produce, type Draft } from 'immer'
import { toast } from 'sonner'
import { useAppData } from '@/lib/app-data'
import { repo } from '@/lib/repo'
import { normalizeProposal } from '@/lib/templates'
import type { Proposal } from '@/lib/types'

/*
 * Cópia de segurança neste navegador: cada alteração vai para o IndexedDB
 * antes de ir para o banco e só sai de lá quando o banco confirma. Se a
 * gravação falhar (internet, aba fechada), a proposta volta com as
 * alterações na próxima vez que for aberta.
 */
const drafts = createStore('cibus-propostas-drafts', 'drafts')
const backup = (p: Proposal) => set(p.id, p, drafts).catch(() => undefined)
const clearBackup = (p: Proposal) =>
  get<Proposal>(p.id, drafts)
    .then((b) => (b && b.updatedAt <= p.updatedAt ? del(p.id, drafts) : undefined))
    .catch(() => undefined)

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

/** Tenta de novo quando o banco recusa por instabilidade. */
async function saveWithRetry(p: Proposal) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await repo.saveProposal(p)
    } catch (e) {
      if (attempt >= 2 || /grandes demais/.test((e as Error).message)) throw e
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt))
    }
  }
}

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
      .then(async (server) => {
        const local = await get<Proposal>(id, drafts).catch(() => undefined)
        if (!alive) return
        // alterações que não chegaram ao banco na última vez
        const recovered = local && (!server || local.updatedAt > server.updatedAt) ? local : null
        const p = recovered ?? server
        if (!p) return setNotFound(true)
        const exec = executives.find((e) => e.id === p.meta?.executiveId) ?? null
        const n = normalizeProposal(p, { settings, modules, executive: exec })
        latest.current = n
        setProposal(n)
        if (recovered) {
          toast.info('Recuperamos alterações que ainda não tinham sido salvas.')
          dirty.current = true
          persist()
        } else if (local) del(id, drafts).catch(() => undefined)
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
        await backup(stamped)
        await saveWithRetry(stamped)
        await clearBackup(stamped)
        if (latest.current === p) setSaveState('saved')
      } catch (e) {
        dirty.current = true
        setSaveState('error')
        toast.error(`Não foi possível salvar: ${(e as Error).message}`, {
          description: 'As alterações ficaram guardadas neste navegador e serão enviadas na próxima gravação.',
        })
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

  // salva ao sair da página e avisa se ainda há algo por gravar
  useEffect(() => {
    const flush = () => {
      if (dirty.current) persist()
    }
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return
      if (latest.current) backup(latest.current)
      persist()
      e.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      flush()
    }
  }, [persist])

  return { proposal, update, save: persist, saveState, notFound }
}
