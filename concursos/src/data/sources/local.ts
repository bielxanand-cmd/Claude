import { planNoticeImport } from '@/domain/import-notice'
import type { Career, CatalogSnapshot, Position, Summary, UserProfile, UserSelection, UserTopic } from '@/domain/types'
import { readJSON, removeKey, uuid, writeJSON } from '@/lib/storage'
import { htmlToText, slugify } from '@/lib/text'
import { buildSeedRows, type CatalogRows } from '../seed'
import type { DataSource } from './types'

const CATALOG_KEY = 'concursos.catalog.v1'
const USER_KEY = 'concursos.user.v1'

/** Latência artificial pequena para que estados de carregamento sejam perceptíveis e realistas. */
const LATENCY = 120
const delay = <T>(value: T, ms = LATENCY) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

interface UserState {
  profile: UserProfile
  selection: UserSelection | null
  topics: Record<string, UserTopic>
  summaries: Record<string, Summary>
}

type CustomCatalog = { [K in keyof CatalogRows]: CatalogRows[K] }

const emptyCustom = (): CustomCatalog => ({
  careers: [],
  positions: [],
  contests: [],
  subjects: [],
  topics: [],
  contestSubjects: [],
  contestTopics: [],
})

export function createLocalDataSource(): DataSource {
  const seed = buildSeedRows()

  const loadCustom = () => ({ ...emptyCustom(), ...readJSON<Partial<CustomCatalog>>(CATALOG_KEY, {}) })
  const catalog = (): CatalogRows => {
    const custom = loadCustom()
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
  const saveCustom = (update: (c: CustomCatalog) => void) => {
    const custom = loadCustom()
    update(custom)
    writeJSON(CATALOG_KEY, custom)
  }

  const loadUser = (): UserState => {
    const state = readJSON<UserState | null>(USER_KEY, null)
    if (state) return state
    const fresh: UserState = {
      profile: { id: uuid(), name: '', email: null, createdAt: new Date().toISOString() },
      selection: null,
      topics: {},
      summaries: {},
    }
    writeJSON(USER_KEY, fresh)
    return fresh
  }
  const saveUser = (update: (s: UserState) => void) => {
    const state = loadUser()
    update(state)
    writeJSON(USER_KEY, state)
    return state
  }

  return {
    kind: 'local',

    async listCareers() {
      return delay(catalog().careers)
    },

    async listPositions(filter = {}) {
      const rows = catalog()
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
      const rows = catalog()
      const position = rows.positions.find((p) => p.id === positionId)
      const career = position && rows.careers.find((c) => c.id === position.careerId)
      if (!position || !career) return delay(null)
      const contests = rows.contests.filter((c) => c.positionId === positionId)
      const ids = new Set(contests.map((c) => c.id))
      const snapshot: CatalogSnapshot = {
        career,
        position,
        contests,
        subjects: rows.subjects,
        topics: rows.topics,
        contestSubjects: rows.contestSubjects.filter((cs) => ids.has(cs.contestId)),
        contestTopics: rows.contestTopics.filter((ct) => ids.has(ct.contestId)),
      }
      return delay(snapshot)
    },

    async createCareer({ name, description = '' }) {
      const career: Career = { id: `custom-${slugify(name)}-${uuid().slice(0, 6)}`, slug: slugify(name), name, description, icon: 'layers', isCustom: true }
      saveCustom((c) => c.careers.push(career))
      return delay(career, 0)
    },

    async createPosition({ careerId, name, description = '', spheres }) {
      const position: Position = { id: `custom-${slugify(name)}-${uuid().slice(0, 6)}`, careerId, name, description, spheres, isCustom: true }
      saveCustom((c) => c.positions.push(position))
      return delay(position, 0)
    },

    async importNotice(input) {
      const rows = catalog()
      const result = planNoticeImport(input, rows, uuid)
      saveCustom((c) => {
        c.contests.push(result.contest)
        c.subjects.push(...result.newSubjects)
        c.topics.push(...result.newTopics)
        c.contestSubjects.push(...result.contestSubjects)
        c.contestTopics.push(...result.contestTopics)
      })
      return delay(result.contest)
    },

    async getProfile() {
      return delay(loadUser().profile, 0)
    },

    async updateProfile(patch) {
      return delay(saveUser((s) => Object.assign(s.profile, patch)).profile, 0)
    },

    async getSelection() {
      return delay(loadUser().selection, 0)
    },

    async setSelection(selection) {
      const state = saveUser((s) => {
        s.selection = selection ? { ...selection, createdAt: new Date().toISOString() } : null
      })
      return delay(state.selection, 0)
    },

    async listUserTopics() {
      return delay(Object.values(loadUser().topics))
    },

    async updateUserTopic(topicId, patch) {
      const state = saveUser((s) => {
        const current: UserTopic = s.topics[topicId] ?? {
          topicId,
          status: 'not_started',
          lastStudiedAt: null,
          completedAt: null,
          lastAccessedAt: null,
        }
        s.topics[topicId] = { ...current, ...patch }
      })
      return delay(state.topics[topicId], 0)
    },

    async listSummaries() {
      return delay(Object.values(loadUser().summaries))
    },

    async saveSummary(topicId, content) {
      const summary: Summary = {
        topicId,
        content,
        plainText: htmlToText(Object.values(content).join(' ')),
        updatedAt: new Date().toISOString(),
      }
      saveUser((s) => {
        s.summaries[topicId] = summary
      })
      return delay(summary, 250)
    },

    async deleteSummary(topicId) {
      saveUser((s) => {
        delete s.summaries[topicId]
      })
      return delay(undefined, 0)
    },

    async resetUserData() {
      removeKey(USER_KEY)
      removeKey(CATALOG_KEY)
      return delay(undefined, 0)
    },
  }
}
