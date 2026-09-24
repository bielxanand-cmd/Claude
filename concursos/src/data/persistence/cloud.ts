import { setSyncStatus } from './status'
import { emptyCatalog, groupImports, type Change, type ImportRows, type Persistence, type Snapshot, type UserState } from './types'

/**
 * Persistência na conta do usuário quando o app roda como página publicada
 * no claude.ai (capacidades `db` + `user`). Os dados ficam no subárvore
 * privado `data/users/<id>/`, visível só para o próprio usuário, e seguem
 * a pessoa em qualquer navegador/dispositivo — ao contrário do localStorage,
 * que o Safari descarta em páginas incorporadas.
 *
 *   data/users/<id>/state                    perfil, concurso atual, histórico
 *   data/users/<id>/progress                 status de cada assunto
 *   data/users/<id>/state/summaries/<assunto> um resumo por documento
 *   data/users/<id>/state/flashcards/<assunto> os flashcards de um assunto
 *   data/users/<id>/catalog                  carreiras e cargos criados
 *   data/users/<id>/catalog/imports/<edital>  um edital importado por documento
 *
 * (Documentos têm limite de 256 KiB; por isso resumos e editais ficam separados.)
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
  delete(): Promise<void>
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

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_\-~:@+]/g, '_').slice(0, 190) || '_'
const isDbError = (e: unknown): e is DbError => typeof e === 'object' && e !== null && 'code' in e
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

  /* ---------------------------------------------- fila de gravação por documento */
  // Uma gravação por vez em cada documento; rajadas são agrupadas (vale a mais recente).
  const pending = new Map<string, { ref: DocRef; body: Record<string, unknown> | null }>()
  const running = new Set<string>()
  let failures = 0

  const refreshStatus = () =>
    setSyncStatus(running.size + pending.size > 0 ? { state: 'saving' } : failures > 0 ? { state: 'error' } : { state: 'idle', message: null })

  const runQueue = async (path: string) => {
    running.add(path)
    refreshStatus()
    await wait(250) // agrupa alterações em sequência (ex.: marcar vários assuntos)
    while (pending.has(path)) {
      const { ref, body } = pending.get(path)!
      pending.delete(path)
      for (let attempt = 0; ; attempt++) {
        try {
          if (body) await ref.set(body)
          else await ref.delete()
          failures = 0
          break
        } catch (err) {
          if (isDbError(err) && err.code === 'unavailable' && attempt < 2) {
            await wait(500 + Math.random() * 1000)
            continue
          }
          failures++
          const tooBig = isDbError(err) && err.code === 'invalid_argument'
          setSyncStatus({
            message: tooBig
              ? 'Um item ficou grande demais para salvar na sua conta (limite de 256 KB por resumo ou edital).'
              : 'Não foi possível salvar na sua conta. Suas alterações continuam abertas nesta página.',
          })
          console.error('[nuvem] falha ao salvar', path, err)
          break
        }
      }
    }
    running.delete(path)
    refreshStatus()
  }

  const write = (ref: DocRef, body: Record<string, unknown> | null) => {
    pending.set(ref.path, { ref, body })
    if (!running.has(ref.path)) void runQueue(ref.path)
    else refreshStatus()
  }

  const stateBody = (u: UserState) => ({ profile: u.profile, selection: u.selection, history: u.history, v: 1 })
  const importRef = (rows: ImportRows) => imports.doc(safeId(rows.contest.id))
  const saveImport = (rows: ImportRows) => write(importRef(rows), { ...rows, v: 1 } as unknown as Record<string, unknown>)

  // Não deixa o usuário fechar a página com gravações pendentes
  globalThis.window?.addEventListener('beforeunload', (e) => {
    if (running.size + pending.size > 0) e.preventDefault()
  })

  const persistence: Persistence = {
    kind: 'cloud',

    async load() {
      const [state, progress, catalog] = await Promise.all([stateDoc.get(), progressDoc.get(), catalogDoc.get()])
      if (!state.exists && !progress.exists && !catalog.exists) return null
      const [summaryDocs, importDocs, flashcardDocs] = await Promise.all([summaries.limit(1000).get(), imports.limit(500).get(), flashcards.limit(1000).get()])

      const s = (state.data() ?? {}) as Partial<UserState>
      const userState: UserState | null = s.profile
        ? {
            profile: s.profile,
            selection: s.selection ?? null,
            history: s.history ?? [],
            topics: ((progress.data() ?? {}).topics ?? {}) as UserState['topics'],
            summaries: Object.fromEntries(
              summaryDocs.docs
                .map((d) => d.data() as unknown as UserState['summaries'][string] | undefined)
                .filter((x): x is UserState['summaries'][string] => !!x?.topicId)
                .map((x) => [x.topicId, x]),
            ),
            flashcards: Object.fromEntries(
              flashcardDocs.docs
                .map((d) => d.data() as { topicId?: string; cards?: UserState['flashcards'][string] } | undefined)
                .filter((x): x is { topicId: string; cards: UserState['flashcards'][string] } => !!x?.topicId && Array.isArray(x.cards))
                .map((x) => [x.topicId, x.cards]),
            ),
          }
        : null

      const c = (catalog.data() ?? {}) as Partial<Snapshot['catalog']>
      const merged = { ...emptyCatalog(), careers: c.careers ?? [], positions: c.positions ?? [] }
      for (const d of importDocs.docs) {
        const rows = d.data() as unknown as ImportRows | undefined
        if (!rows?.contest) continue
        merged.contests.push(rows.contest)
        merged.subjects.push(...rows.subjects)
        merged.topics.push(...rows.topics)
        merged.contestSubjects.push(...rows.contestSubjects)
        merged.contestTopics.push(...rows.contestTopics)
      }
      return { user: userState, catalog: merged }
    },

    save(change: Change, snap: Snapshot) {
      switch (change.type) {
        case 'meta':
          write(stateDoc, stateBody(snap.user))
          break
        case 'topic':
          write(progressDoc, { topics: snap.user.topics, v: 1 })
          break
        case 'summary': {
          const summary = snap.user.summaries[change.topicId]
          write(summaries.doc(safeId(change.topicId)), summary ? ({ ...summary } as unknown as Record<string, unknown>) : null)
          break
        }
        case 'flashcards': {
          const cards = snap.user.flashcards[change.topicId]
          write(flashcards.doc(safeId(change.topicId)), cards?.length ? { topicId: change.topicId, cards, v: 1 } : null)
          break
        }
        case 'catalog-meta':
          write(catalogDoc, { careers: snap.catalog.careers, positions: snap.catalog.positions, v: 1 })
          break
        case 'import':
          saveImport(change.rows)
          break
      }
    },

    async saveAll(snap) {
      write(stateDoc, stateBody(snap.user))
      write(progressDoc, { topics: snap.user.topics, v: 1 })
      write(catalogDoc, { careers: snap.catalog.careers, positions: snap.catalog.positions, v: 1 })
      for (const topicId of Object.keys(snap.user.summaries)) persistence.save({ type: 'summary', topicId }, snap)
      for (const topicId of Object.keys(snap.user.flashcards)) persistence.save({ type: 'flashcards', topicId }, snap)
      for (const rows of groupImports(snap.catalog)) saveImport(rows)
    },

    async clear() {
      const [summaryDocs, importDocs, flashcardDocs] = await Promise.all([summaries.limit(1000).get(), imports.limit(500).get(), flashcards.limit(1000).get()])
      await Promise.all([
        ...flashcardDocs.docs.map((d) => flashcards.doc(d.id).delete()),
        stateDoc.delete(),
        progressDoc.delete(),
        catalogDoc.delete(),
        ...summaryDocs.docs.map((d) => summaries.doc(d.id).delete()),
        ...importDocs.docs.map((d) => imports.doc(d.id).delete()),
      ])
    },
  }
  return persistence
}
