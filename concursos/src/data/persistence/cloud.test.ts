import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCard } from '@/domain/flashcards'
import { parseNoticeSyllabus } from '@/domain/notice-parser'
import { createLocalDataSource } from '../sources/local'
import { createCloudPersistence } from './cloud'

/** Banco em memória com a mesma API usada do runtime do claude.ai (db + user). */
function fakeRuntime(uid: string | null = 'viewer-1') {
  const docs = new Map<string, Record<string, unknown>>()
  const writes: string[] = []
  const snap = (path: string) => ({
    id: path.split('/').at(-1)!,
    exists: docs.has(path),
    data: () => (docs.has(path) ? structuredClone(docs.get(path)) : undefined),
  })
  const docRef = (path: string): unknown => ({
    path,
    get: async () => snap(path),
    set: async (body: Record<string, unknown>) => {
      if (JSON.stringify(body).length > 256 * 1024) throw { code: 'invalid_argument', message: 'document too large' }
      writes.push(path)
      docs.set(path, structuredClone(body))
    },
    delete: async () => void docs.delete(path),
    collection: (sub: string) => collRef(`${path}/${sub}`),
  })
  const collRef = (path: string) => ({
    doc: (id: string) => docRef(`${path}/${id}`),
    limit: () => ({
      get: async () => ({ docs: [...docs.keys()].filter((k) => k.startsWith(`${path}/`) && k.split('/').length === path.split('/').length + 1).map(snap) }),
    }),
  })
  const runtime = {
    use: async (name: string) => (name === 'db' ? { doc: docRef } : name === 'user' ? { id: async () => uid } : null),
  }
  return { runtime, docs, writes }
}

const flush = () => new Promise((r) => setTimeout(r, 700))

function fakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }
}

describe('dados salvos na conta (página publicada)', () => {
  let fake: ReturnType<typeof fakeRuntime>
  beforeEach(() => {
    fake = fakeRuntime()
    ;(globalThis as Record<string, unknown>).claude = fake.runtime
    ;(globalThis as Record<string, unknown>).localStorage = fakeLocalStorage()
  })
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).claude
    delete (globalThis as Record<string, unknown>).localStorage
  })

  it('ao reabrir, recupera concursos, edital importado, progresso e resumos', { timeout: 15_000 }, async () => {
    const first = createLocalDataSource(createCloudPersistence)
    const position = await first.createPosition({ careerId: 'policial', name: 'Policial Rodoviário Federal', spheres: ['federal'] })
    await first.importNotice({
      positionId: position.id,
      contest: {
        name: 'Concurso PRF 2021',
        organization: 'Polícia Rodoviária Federal',
        organizationShort: 'PRF',
        sphere: 'federal',
        state: null,
        city: null,
        year: 2021,
        examBoard: 'Cebraspe',
        noticeUrl: null,
        noticeDate: null,
        origin: 'pdf',
      },
      subjects: parseNoticeSyllabus('LEGISLAÇÃO DE TRÂNSITO: 1 Código de Trânsito Brasileiro. 2 Resoluções do CONTRAN. 2.1 Resolução 432.'),
    })
    await first.setSelection({ positionId: position.id, sphere: 'federal', state: null })
    await first.setSelection({ positionId: 'auditor-fiscal-estadual', sphere: 'estadual', state: 'SP' })
    const plan = await first.getCatalogSnapshot(position.id)
    const topicId = plan!.contestTopics[0].topicId
    await first.updateUserTopic(topicId, { status: 'completed', completedAt: '2026-09-24T10:00:00Z' })
    await first.saveSummary(topicId, { summary: '<p>CTB: Lei 9.503/1997</p>', keyPoints: '', pitfalls: '', notes: '' })
    await first.saveTopicFlashcards(topicId, [
      createCard(topicId, { kind: 'qa', front: 'Lei do CTB?', back: '9.503/1997', context: null }, 'summary', 'card-1'),
    ])
    await flush()

    // Os dados ficam no subárvore privado do usuário
    expect([...fake.docs.keys()].every((k) => k.startsWith('data/users/viewer-1/'))).toBe(true)

    // Nova visita (outro navegador): nada no localStorage, tudo vem da conta
    ;(globalThis as Record<string, unknown>).localStorage = fakeLocalStorage()
    const second = createLocalDataSource(createCloudPersistence)
    expect(await second.getSelection()).toMatchObject({ positionId: 'auditor-fiscal-estadual', state: 'SP' })
    expect((await second.listRecentSelections()).map((s) => s.positionId)).toEqual(['auditor-fiscal-estadual', position.id])
    const reopened = await second.getCatalogSnapshot(position.id)
    expect(reopened?.contests.map((c) => c.organizationShort)).toEqual(['PRF'])
    expect(reopened?.contestTopics.find((ct) => ct.topicId === topicId)?.details ?? []).toEqual([])
    expect(reopened?.contestTopics.some((ct) => ct.details?.includes('Resolução 432'))).toBe(true)
    expect((await second.listUserTopics()).find((t) => t.topicId === topicId)?.status).toBe('completed')
    expect((await second.listSummaries())[0].content.summary).toContain('9.503')
    expect((await second.listFlashcards()).map((c) => c.front)).toEqual(['Lei do CTB?'])
  })

  it('na primeira abertura, leva para a conta o que estava salvo no navegador', { timeout: 15_000 }, async () => {
    // Uso anterior só com o navegador
    const offline = createLocalDataSource()
    await offline.setSelection({ positionId: 'analista-ti', sphere: 'federal', state: null })
    await offline.updateUserTopic('lingua-portuguesa__crase', { status: 'in_progress' })

    const online = createLocalDataSource(createCloudPersistence)
    expect(await online.getSelection()).toMatchObject({ positionId: 'analista-ti' })
    await flush()
    expect(fake.docs.get('data/users/viewer-1/state')).toMatchObject({ selection: { positionId: 'analista-ti' } })
    expect(fake.docs.get('data/users/viewer-1/progress')).toMatchObject({ topics: { 'lingua-portuguesa__crase': { status: 'in_progress' } } })
  })

  it('agrupa gravações em sequência no mesmo documento', { timeout: 15_000 }, async () => {
    const source = createLocalDataSource(createCloudPersistence)
    for (let i = 0; i < 10; i++) await source.updateUserTopic(`t${i}`, { status: 'completed' })
    await flush()
    expect(fake.writes.filter((p) => p.endsWith('/progress')).length).toBeLessThanOrEqual(2)
    expect(Object.keys((fake.docs.get('data/users/viewer-1/progress') as { topics: object }).topics)).toHaveLength(10)
  })

  it('sem identidade do usuário, usa o navegador', async () => {
    ;(globalThis as Record<string, unknown>).claude = fakeRuntime(null).runtime
    expect(await createCloudPersistence()).toBeNull()
  })

  it('apagar dados limpa a conta', { timeout: 15_000 }, async () => {
    const source = createLocalDataSource(createCloudPersistence)
    await source.setSelection({ positionId: 'analista-ti', sphere: 'federal', state: null })
    await source.saveSummary('lingua-portuguesa__crase', { summary: '<p>x</p>', keyPoints: '', pitfalls: '', notes: '' })
    await flush()
    await source.resetUserData()
    expect(fake.docs.size).toBe(0)
  })
})
