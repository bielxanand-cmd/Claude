import { planNoticeImport } from '@/domain/import-notice'
import type { Career, CatalogSnapshot, Position, Summary, UserSelection, UserTopic } from '@/domain/types'
import { uuid } from '@/lib/storage'
import { htmlToText, slugify } from '@/lib/text'
import { createBrowserPersistence } from '../persistence/browser'
import { setSyncStatus } from '../persistence/status'
import { emptyCatalog, type Change, type Persistence, type Snapshot, type UserState } from '../persistence/types'
import { buildSeedRows, type CatalogRows } from '../seed'
import type { DataSource } from './types'

/** Latência artificial pequena para que estados de carregamento sejam perceptíveis e realistas. */
const LATENCY = 120
const delay = <T>(value: T, ms = LATENCY) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

/** Quantos concursos o histórico guarda. */
const HISTORY_LIMIT = 20

const freshUser = (): UserState => ({
  profile: { id: uuid(), name: '', email: null, createdAt: new Date().toISOString() },
  selection: null,
  history: [],
  topics: {},
  summaries: {},
  flashcards: {},
})

/**
 * Fonte de dados sem backend próprio: catálogo demonstrativo + dados do
 * usuário carregados uma vez (da conta no claude.ai ou do navegador) e
 * mantidos em memória; cada alteração é gravada pela camada de persistência.
 *
 * @param cloud cria a persistência na conta do usuário (página publicada);
 *              quando indisponível, usa o armazenamento do navegador.
 */
export function createLocalDataSource(cloud?: () => Promise<Persistence | null>): DataSource {
  const seed = buildSeedRows()
  const browser = createBrowserPersistence()
  let persistence: Persistence = browser
  let snapshot: Snapshot = { user: freshUser(), catalog: emptyCatalog() }

  const ready = (async () => {
    let cloudPersistence: Persistence | null = null
    try {
      cloudPersistence = cloud ? await cloud() : null
    } catch (err) {
      console.warn('[dados] nuvem indisponível', err)
    }

    if (cloudPersistence) {
      try {
        let loaded = await cloudPersistence.load().catch(async () => {
          await new Promise((r) => setTimeout(r, 800))
          return cloudPersistence!.load()
        })
        if (!loaded) {
          // Primeira vez na nuvem: leva o que estiver salvo neste navegador
          const local = await browser.load()
          if (local?.user) {
            loaded = local
            await cloudPersistence.saveAll({ user: local.user, catalog: local.catalog })
          }
        }
        persistence = cloudPersistence
        snapshot = { user: loaded?.user ?? freshUser(), catalog: loaded?.catalog ?? emptyCatalog() }
        setSyncStatus({ where: 'cloud', state: 'idle', message: null })
        return
      } catch (err) {
        // Não sobrescreve a nuvem com um estado vazio: segue só neste navegador
        console.error('[dados] falha ao carregar da nuvem', err)
        setSyncStatus({
          where: 'browser',
          state: 'error',
          message: 'Não foi possível carregar seus dados da sua conta. Nesta visita, as alterações ficam só neste navegador.',
        })
      }
    }

    const local = await browser.load()
    snapshot = { user: local?.user ?? freshUser(), catalog: local?.catalog ?? emptyCatalog() }
    persistence = browser
    if (!cloudPersistence) setSyncStatus({ where: 'browser', state: 'idle' })
  })()

  const save = (change: Change) => persistence.save(change, snapshot)
  const user = async () => {
    await ready
    return snapshot.user
  }

  const catalog = async (): Promise<CatalogRows> => {
    await ready
    const custom = snapshot.catalog
    return {
      careers: [...seed.careers.filter((c) => c.id !== 'outras'), ...custom.careers, ...seed.careers.filter((c) => c.id === 'outras')],
      positions: [...seed.positions, ...custom.positions],
      contests: [...seed.contests, ...custom.contests],
      subjects: [...seed.subjects, ...custom.subjects],
      topics: [...seed.topics, ...custom.topics],
      contestSubjects: [...seed.contestSubjects, ...custom.contestSubjects],
      contestTopics: [...seed.contestTopics, ...custom.contestTopics],
    }
  }

  return {
    kind: 'local',

    async listCareers() {
      return delay((await catalog()).careers)
    },

    async listPositions(filter = {}) {
      const rows = await catalog()
      const items = rows.positions
        .filter((p) => !filter.careerId || p.careerId === filter.careerId)
        .filter((p) => !filter.sphere || p.spheres.includes(filter.sphere))
        .map((position) => ({
          position,
          career: rows.careers.find((c) => c.id === position.careerId)!,
          contests: rows.contests.filter((c) => c.positionId === position.id),
        }))
        .filter((item) => item.career)
      return delay(items)
    },

    async getCatalogSnapshot(positionId) {
      const rows = await catalog()
      const position = rows.positions.find((p) => p.id === positionId)
      const career = position && rows.careers.find((c) => c.id === position.careerId)
      if (!position || !career) return delay(null)
      const contests = rows.contests.filter((c) => c.positionId === positionId)
      const ids = new Set(contests.map((c) => c.id))
      const result: CatalogSnapshot = {
        career,
        position,
        contests,
        subjects: rows.subjects,
        topics: rows.topics,
        contestSubjects: rows.contestSubjects.filter((cs) => ids.has(cs.contestId)),
        contestTopics: rows.contestTopics.filter((ct) => ids.has(ct.contestId)),
      }
      return delay(result)
    },

    async createCareer({ name, description = '' }) {
      await ready
      const career: Career = { id: `custom-${slugify(name)}-${uuid().slice(0, 6)}`, slug: slugify(name), name, description, icon: 'layers', isCustom: true }
      snapshot.catalog.careers.push(career)
      save({ type: 'catalog-meta' })
      return delay(career, 0)
    },

    async createPosition({ careerId, name, description = '', spheres }) {
      await ready
      const position: Position = { id: `custom-${slugify(name)}-${uuid().slice(0, 6)}`, careerId, name, description, spheres, isCustom: true }
      snapshot.catalog.positions.push(position)
      save({ type: 'catalog-meta' })
      return delay(position, 0)
    },

    async importNotice(input) {
      const result = planNoticeImport(input, await catalog(), uuid)
      const c = snapshot.catalog
      c.contests.push(result.contest)
      c.subjects.push(...result.newSubjects)
      c.topics.push(...result.newTopics)
      c.contestSubjects.push(...result.contestSubjects)
      c.contestTopics.push(...result.contestTopics)
      save({
        type: 'import',
        rows: {
          contest: result.contest,
          subjects: result.newSubjects,
          topics: result.newTopics,
          contestSubjects: result.contestSubjects,
          contestTopics: result.contestTopics,
        },
      })
      return delay(result.contest)
    },

    async getProfile() {
      return delay((await user()).profile, 0)
    },

    async updateProfile(patch) {
      const u = await user()
      Object.assign(u.profile, patch)
      save({ type: 'meta' })
      return delay({ ...u.profile }, 0)
    },

    async getSelection() {
      return delay((await user()).selection, 0)
    },

    async setSelection(selection) {
      const u = await user()
      const next: UserSelection | null = selection ? { ...selection, createdAt: new Date().toISOString() } : null
      u.selection = next
      if (next) u.history = [next, ...u.history.filter((h) => h.positionId !== next.positionId)].slice(0, HISTORY_LIMIT)
      save({ type: 'meta' })
      return delay(next, 0)
    },

    async listRecentSelections() {
      return delay([...(await user()).history], 0)
    },

    async forgetSelection(positionId) {
      const u = await user()
      u.history = u.history.filter((h) => h.positionId !== positionId)
      save({ type: 'meta' })
      return delay(undefined, 0)
    },

    async listUserTopics() {
      return delay(Object.values((await user()).topics))
    },

    async updateUserTopic(topicId, patch) {
      const u = await user()
      const current: UserTopic = u.topics[topicId] ?? {
        topicId,
        status: 'not_started',
        lastStudiedAt: null,
        completedAt: null,
        lastAccessedAt: null,
      }
      u.topics[topicId] = { ...current, ...patch }
      save({ type: 'topic', topicId })
      return delay({ ...u.topics[topicId] }, 0)
    },

    async listSummaries() {
      return delay(Object.values((await user()).summaries))
    },

    async saveSummary(topicId, content) {
      const u = await user()
      const summary: Summary = {
        topicId,
        content,
        plainText: htmlToText(Object.values(content).join(' ')),
        updatedAt: new Date().toISOString(),
      }
      u.summaries[topicId] = summary
      save({ type: 'summary', topicId })
      return delay(summary, 250)
    },

    async deleteSummary(topicId) {
      const u = await user()
      delete u.summaries[topicId]
      save({ type: 'summary', topicId })
      return delay(undefined, 0)
    },

    async listFlashcards() {
      return delay(Object.values((await user()).flashcards).flat(), 0)
    },

    async saveTopicFlashcards(topicId, cards) {
      const u = await user()
      if (cards.length) u.flashcards[topicId] = cards.map((c) => ({ ...c, topicId }))
      else delete u.flashcards[topicId]
      save({ type: 'flashcards', topicId })
      return delay(u.flashcards[topicId] ?? [], 0)
    },

    async resetUserData() {
      await ready
      await persistence.clear()
      if (persistence !== browser) await browser.clear()
      snapshot = { user: freshUser(), catalog: emptyCatalog() }
      return delay(undefined, 0)
    },
  }
}
