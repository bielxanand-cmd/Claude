import type { UserTopic } from '@/domain/types'
import { readJSON, removeKey, writeJSON } from '@/lib/storage'
import { setSyncStatus } from './status'
import { emptyCatalog, groupImports, type Change, type ImportRows, type Persistence, type RemoteChange, type Snapshot, type UserState } from './types'

/**
 * Persistência na conta do usuário quando o app roda como página publicada
 * no claude.ai (capacidades `db` + `user`). Os dados ficam no subárvore
 * privado `data/users/<id>/`, visível só para o próprio usuário, e seguem
 * a pessoa em qualquer navegador/dispositivo — ao contrário do localStorage,
 * que o Safari descarta em páginas incorporadas.
 *
 *   data/users/<id>/state                      perfil, concurso atual, histórico
 *   data/users/<id>/progress                   status de cada assunto (mesclado assunto a assunto)
 *   data/users/<id>/state/summaries/<assunto>  um resumo por documento
 *   data/users/<id>/state/flashcards/<assunto> os flashcards de um assunto
 *   data/users/<id>/catalog                    carreiras e cargos criados
 *   data/users/<id>/catalog/imports/<edital>   um edital importado por documento
 *
 * Garantias:
 * - cada alteração é enviada na hora e fica registrada num diário local até
 *   ser confirmada; ao reabrir a página, o diário é reenviado antes de ler;
 * - o progresso é mesclado por assunto (`update`), então uma aba ou aparelho
 *   com dados antigos não apaga o que outro salvou;
 * - o progresso de outras abas/aparelhos chega ao vivo (`onSnapshot`);
 * - falhas transitórias são repetidas com espera crescente, sem descartar.
 */

/* Tipagem mínima do que usamos da API do runtime (contrato 0.2.x). */
interface DbError {
  code: string
  message: string
}
interface DocSnap {
  id: string
  exists: boolean
  data(): Record<string, unknown> | undefined
}
interface DocRef {
  path: string
  get(): Promise<DocSnap>
  set(data: Record<string, unknown>): Promise<void>
  update(data: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
  onSnapshot?(next: (snap: DocSnap) => void, error?: (e: DbError) => void): () => void
  collection(path: string): CollRef
}
interface CollRef {
  doc(id: string): DocRef
  limit(n: number): { get(): Promise<{ docs: DocSnap[] }> }
}
interface Db {
  doc(path: string): DocRef
}
interface UserCap {
  id(): Promise<string | null>
}
interface ClaudeRuntime {
  use(name: 'db'): Promise<Db | null>
  use(name: 'user'): Promise<UserCap | null>
}

type Body = Record<string, unknown>
/** Operação pendente num documento. `merge` = mesclagem profunda (update). */
type Op = { kind: 'set'; body: Body } | { kind: 'merge'; body: Body } | { kind: 'delete' }

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_\-~:@+]/g, '_').slice(0, 190) || '_'
const isDbError = (e: unknown): e is DbError => typeof e === 'object' && e !== null && 'code' in e
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const isObject = (v: unknown): v is Body => typeof v === 'object' && v !== null && !Array.isArray(v)

function deepMerge(target: Body, source: Body): Body {
  const out: Body = { ...target }
  for (const [k, v] of Object.entries(source)) out[k] = isObject(v) && isObject(out[k]) ? deepMerge(out[k] as Body, v) : v
  return out
}

/** Junta duas operações pendentes no mesmo documento. */
function combine(prev: Op | undefined, next: Op): Op {
  if (!prev || next.kind !== 'merge') return next
  if (prev.kind === 'merge') return { kind: 'merge', body: deepMerge(prev.body, next.body) }
  if (prev.kind === 'set') return { kind: 'set', body: deepMerge(prev.body, next.body) }
  return { kind: 'set', body: next.body }
}

/** Qual versão de um assunto é mais recente (para mesclar abas/aparelhos). */
export function newerTopic(a: UserTopic | undefined, b: UserTopic | undefined): UserTopic | undefined {
  if (!a) return b
  if (!b) return a
  const stamp = (t: UserTopic) => t.updatedAt ?? [t.completedAt, t.lastStudiedAt, t.lastAccessedAt].filter(Boolean).sort().at(-1) ?? ''
  return stamp(b) > stamp(a) ? b : a
}

const RETRY_DELAYS = [1000, 3000, 8000, 20000, 45000]

export async function createCloudPersistence(): Promise<Persistence | null> {
  const claude = (globalThis as { claude?: ClaudeRuntime }).claude
  if (!claude?.use) return null
  const [db, user] = await Promise.all([claude.use('db'), claude.use('user')])
  if (!db || !user) return null
  const uid = await user.id()
  if (!uid) return null

  const base = `data/users/${uid}`
  const stateDoc = db.doc(`${base}/state`)
  const progressDoc = db.doc(`${base}/progress`)
  const catalogDoc = db.doc(`${base}/catalog`)
  const summaries = stateDoc.collection('summaries')
  const flashcards = stateDoc.collection('flashcards')
  const imports = catalogDoc.collection('imports')

  /* ------------------------------------------------ diário de gravações pendentes */
  const JOURNAL_KEY = `concursos.cloud-journal.${safeId(uid)}`
  const pending = new Map<string, Op>()
  const refs = new Map<string, DocRef>()
  const running = new Set<string>()
  const attempts = new Map<string, number>()
  let lastError: string | null = null

  const saveJournal = () => {
    if (pending.size === 0) removeKey(JOURNAL_KEY)
    else writeJSON(JOURNAL_KEY, Object.fromEntries(pending))
  }

  const refreshStatus = () =>
    setSyncStatus(
      pending.size + running.size > 0
        ? { state: lastError ? 'error' : 'saving', message: lastError }
        : lastError
          ? { state: 'error', message: lastError }
          : { state: 'idle', message: null },
    )

  const exec = async (ref: DocRef, op: Op) => {
    if (op.kind === 'delete') return ref.delete()
    if (op.kind === 'set') return ref.set(op.body)
    try {
      await ref.update(op.body)
    } catch (err) {
      // `update` exige o documento existente; na primeira gravação, cria.
      if (isDbError(err) && err.code === 'invalid_argument') {
        const snap = await ref.get()
        if (!snap.exists) return ref.set(op.body)
      }
      throw err
    }
  }

  const drain = async (path: string) => {
    if (running.has(path)) return
    running.add(path)
    refreshStatus()
    await wait(30) // agrupa alterações feitas no mesmo instante
    while (pending.has(path)) {
      const op = pending.get(path)!
      pending.delete(path)
      try {
        await exec(refs.get(path)!, op)
        attempts.delete(path)
        lastError = null
        saveJournal()
      } catch (err) {
        const code = isDbError(err) ? err.code : 'unknown'
        console.error('[nuvem] falha ao salvar', path, err)
        if (code === 'invalid_argument') {
          // Não adianta repetir (ex.: documento acima de 256 KB)
          lastError = 'Um item ficou grande demais para salvar na sua conta (limite de 256 KB por resumo ou edital).'
          saveJournal()
          continue
        }
        if (code === 'revoked' || code === 'not_granted') {
          lastError = 'Esta página perdeu o acesso ao armazenamento da sua conta. Recarregue a página.'
          pending.set(path, combine(op, pending.get(path) ?? op))
          break
        }
        // Transitória: devolve à fila (sem perder o que chegou depois) e tenta de novo
        const n = attempts.get(path) ?? 0
        attempts.set(path, n + 1)
        const queued = pending.get(path)
        pending.set(path, queued ? combine(op, queued) : op)
        saveJournal()
        lastError = n >= 1 ? 'Não foi possível salvar na sua conta. Tentando novamente…' : null
        running.delete(path)
        refreshStatus()
        setTimeout(() => void drain(path), RETRY_DELAYS[Math.min(n, RETRY_DELAYS.length - 1)])
        return
      }
    }
    running.delete(path)
    refreshStatus()
  }

  const enqueue = (ref: DocRef, op: Op) => {
    refs.set(ref.path, ref)
    pending.set(ref.path, combine(pending.get(ref.path), op))
    saveJournal()
    void drain(ref.path)
  }

  // Reenvia o que ficou pendente numa visita anterior (antes de ler)
  const replayJournal = async () => {
    const journal = readJSON<Record<string, Op> | null>(JOURNAL_KEY, null)
    if (!journal) return
    for (const [path, op] of Object.entries(journal)) {
      try {
        await exec(db.doc(path), op)
      } catch (err) {
        console.error('[nuvem] falha ao reenviar pendência', path, err)
        refs.set(path, db.doc(path))
        pending.set(path, op)
      }
    }
    saveJournal()
    for (const path of pending.keys()) void drain(path)
  }

  // Avisa se a página for fechada com gravações ainda em andamento
  globalThis.window?.addEventListener('beforeunload', (e) => {
    if (pending.size + running.size > 0) e.preventDefault()
  })

  const stateBody = (u: UserState) => ({ profile: u.profile, selection: u.selection, history: u.history, v: 1 })
  const saveImport = (rows: ImportRows) => enqueue(imports.doc(safeId(rows.contest.id)), { kind: 'set', body: { ...rows, v: 1 } as unknown as Body })

  const persistence: Persistence = {
    kind: 'cloud',

    async load() {
      await replayJournal()
      const [state, progress, catalog] = await Promise.all([stateDoc.get(), progressDoc.get(), catalogDoc.get()])
      if (!state.exists && !progress.exists && !catalog.exists) return null
      const [summaryDocs, importDocs, flashcardDocs] = await Promise.all([
        summaries.limit(1000).get(),
        imports.limit(500).get(),
        flashcards.limit(1000).get(),
      ])

      const s = (state.data() ?? {}) as Partial<UserState>
      const userState: UserState | null = s.profile
        ? {
            profile: { ...s.profile },
            selection: s.selection ?? null,
            history: [...(s.history ?? [])],
            topics: structuredClone(((progress.data() ?? {}).topics ?? {}) as UserState['topics']),
            summaries: Object.fromEntries(
              summaryDocs.docs
                .map((d) => d.data() as unknown as UserState['summaries'][string] | undefined)
                .filter((x): x is UserState['summaries'][string] => !!x?.topicId)
                .map((x) => [x.topicId, structuredClone(x)]),
            ),
            flashcards: Object.fromEntries(
              flashcardDocs.docs
                .map((d) => d.data() as { topicId?: string; cards?: UserState['flashcards'][string] } | undefined)
                .filter((x): x is { topicId: string; cards: UserState['flashcards'][string] } => !!x?.topicId && Array.isArray(x.cards))
                .map((x) => [x.topicId, structuredClone(x.cards)]),
            ),
          }
        : null

      const c = (catalog.data() ?? {}) as Partial<Snapshot['catalog']>
      const merged = { ...emptyCatalog(), careers: [...(c.careers ?? [])], positions: [...(c.positions ?? [])] }
      for (const d of importDocs.docs) {
        const rows = d.data() as unknown as ImportRows | undefined
        if (!rows?.contest) continue
        merged.contests.push(structuredClone(rows.contest))
        merged.subjects.push(...structuredClone(rows.subjects))
        merged.topics.push(...structuredClone(rows.topics))
        merged.contestSubjects.push(...structuredClone(rows.contestSubjects))
        merged.contestTopics.push(...structuredClone(rows.contestTopics))
      }
      return { user: userState, catalog: merged }
    },

    save(change: Change, snap: Snapshot) {
      switch (change.type) {
        case 'meta':
          enqueue(stateDoc, { kind: 'set', body: stateBody(snap.user) })
          break
        case 'topic':
          // Só o assunto alterado: não sobrescreve o progresso salvo por outra aba/aparelho
          enqueue(progressDoc, { kind: 'merge', body: { topics: { [change.topicId]: snap.user.topics[change.topicId] }, v: 1 } })
          break
        case 'summary': {
          const summary = snap.user.summaries[change.topicId]
          enqueue(summaries.doc(safeId(change.topicId)), summary ? { kind: 'set', body: { ...summary } as unknown as Body } : { kind: 'delete' })
          break
        }
        case 'flashcards': {
          const cards = snap.user.flashcards[change.topicId]
          enqueue(flashcards.doc(safeId(change.topicId)), cards?.length ? { kind: 'set', body: { topicId: change.topicId, cards, v: 1 } } : { kind: 'delete' })
          break
        }
        case 'catalog-meta':
          enqueue(catalogDoc, { kind: 'set', body: { careers: snap.catalog.careers, positions: snap.catalog.positions, v: 1 } })
          break
        case 'import':
          saveImport(change.rows)
          break
      }
    },

    async saveAll(snap) {
      enqueue(stateDoc, { kind: 'set', body: stateBody(snap.user) })
      enqueue(progressDoc, { kind: 'merge', body: { topics: snap.user.topics, v: 1 } })
      enqueue(catalogDoc, { kind: 'set', body: { careers: snap.catalog.careers, positions: snap.catalog.positions, v: 1 } })
      for (const topicId of Object.keys(snap.user.summaries)) persistence.save({ type: 'summary', topicId }, snap)
      for (const topicId of Object.keys(snap.user.flashcards)) persistence.save({ type: 'flashcards', topicId }, snap)
      for (const rows of groupImports(snap.catalog)) saveImport(rows)
    },

    subscribe(listener: (change: RemoteChange) => void) {
      // Progresso alterado em outra aba/aparelho chega ao vivo
      if (!progressDoc.onSnapshot) return () => undefined
      return progressDoc.onSnapshot(
        (snap) => {
          const topics = (snap.data()?.topics ?? null) as UserState['topics'] | null
          if (topics) listener({ type: 'topics', topics: structuredClone(topics) })
        },
        (err) => console.warn('[nuvem] sincronização ao vivo encerrada', err),
      )
    },

    async clear() {
      pending.clear()
      saveJournal()
      const [summaryDocs, importDocs, flashcardDocs] = await Promise.all([
        summaries.limit(1000).get(),
        imports.limit(500).get(),
        flashcards.limit(1000).get(),
      ])
      await Promise.all([
        stateDoc.delete(),
        progressDoc.delete(),
        catalogDoc.delete(),
        ...summaryDocs.docs.map((d) => summaries.doc(d.id).delete()),
        ...flashcardDocs.docs.map((d) => flashcards.doc(d.id).delete()),
        ...importDocs.docs.map((d) => imports.doc(d.id).delete()),
      ])
    },
  }
  return persistence
}
