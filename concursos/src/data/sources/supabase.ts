import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { planNoticeImport } from '@/domain/import-notice'
import type {
  Career,
  Contest,
  ContestSubject,
  ContestTopic,
  Position,
  Subject,
  Summary,
  SummaryContent,
  Topic,
  UserProfile,
  UserSelection,
  UserTopic,
} from '@/domain/types'
import { readJSON, removeKey, uuid, writeJSON } from '@/lib/storage'
import { htmlToText, slugify } from '@/lib/text'
import type { DataSource } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any -- linhas cruas do PostgREST */
type Row = Record<string, any>

const ANON_USER_KEY = 'concursos.supabase.user-id'

const toCareer = (r: Row): Career => ({ id: r.id, slug: r.slug, name: r.name, description: r.description, icon: r.icon, isCustom: r.is_custom })
const toPosition = (r: Row): Position => ({ id: r.id, careerId: r.career_id, name: r.name, description: r.description, spheres: r.spheres ?? [], isCustom: r.is_custom })
const toContest = (r: Row): Contest => ({
  id: r.id,
  positionId: r.position_id,
  name: r.name,
  organization: r.organization,
  organizationShort: r.organization_short,
  sphere: r.sphere,
  state: r.state,
  city: r.city,
  year: r.year,
  examBoard: r.exam_boards?.name ?? null,
  noticeUrl: r.notice_url,
  noticeDate: r.notice_date,
  origin: r.origin,
})
const toSubject = (r: Row): Subject => ({ id: r.id, slug: r.slug, name: r.name, icon: r.icon })
const toTopic = (r: Row): Topic => ({ id: r.id, subjectId: r.subject_id, name: r.name, order: r.sort_order })
const toUserTopic = (r: Row): UserTopic => ({
  topicId: r.topic_id,
  status: r.status,
  lastStudiedAt: r.last_studied_at,
  completedAt: r.completed_at,
  lastAccessedAt: r.last_accessed_at,
})
const toSummary = (r: Row): Summary => ({ topicId: r.topic_id, content: r.content, plainText: r.plain_text, updatedAt: r.updated_at })
const toProfile = (r: Row): UserProfile => ({ id: r.id, name: r.name, email: r.email, createdAt: r.created_at })

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

/** Carrega todas as linhas de uma tabela, paginando (o PostgREST limita a 1000 por requisição). */
async function selectAll(client: SupabaseClient, table: string, columns = '*', filter?: (q: any) => any): Promise<Row[]> {
  const pageSize = 1000
  const rows: Row[] = []
  for (let from = 0; ; from += pageSize) {
    let query = client.from(table).select(columns).range(from, from + pageSize - 1)
    if (filter) query = filter(query)
    const page = must<Row[]>(await query)
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

export function createSupabaseDataSource(url: string, anonKey: string): DataSource {
  const client = createClient(url, anonKey)

  /**
   * Resolve o usuário atual: usa o Supabase Auth quando houver sessão; caso
   * contrário, um usuário anônimo cujo id fica salvo no navegador.
   */
  let userIdPromise: Promise<string> | null = null
  const userId = () =>
    (userIdPromise ??= (async () => {
      const { data } = await client.auth.getUser()
      const authId = data.user?.id
      const id = authId ?? readJSON<string | null>(ANON_USER_KEY, null) ?? uuid()
      must(await client.from('users').upsert({ id, email: data.user?.email ?? null }, { onConflict: 'id', ignoreDuplicates: true }))
      if (!authId) writeJSON(ANON_USER_KEY, id)
      return id
    })())

  return {
    kind: 'supabase',

    async listCareers() {
      const rows = must<Row[]>(await client.from('careers').select('*').order('is_custom').order('created_at'))
      return rows.map(toCareer).sort((a, b) => Number(a.id === 'outras') - Number(b.id === 'outras'))
    },

    async listPositions(filter = {}) {
      let query = client.from('positions').select('*, careers(*), contests(*, exam_boards(name))').order('name')
      if (filter.careerId) query = query.eq('career_id', filter.careerId)
      if (filter.sphere) query = query.contains('spheres', [filter.sphere])
      const rows = must<Row[]>(await query)
      return rows.map((r) => ({ position: toPosition(r), career: toCareer(r.careers), contests: (r.contests ?? []).map(toContest) }))
    },

    async getCatalogSnapshot(positionId) {
      const posRow = must<Row | null>(await client.from('positions').select('*, careers(*)').eq('id', positionId).maybeSingle())
      if (!posRow) return null
      const contests = must<Row[]>(await client.from('contests').select('*, exam_boards(name)').eq('position_id', positionId)).map(toContest)
      const ids = contests.map((c) => c.id)
      const [contestSubjects, contestTopics] = ids.length
        ? await Promise.all([
            selectAll(client, 'contest_subjects', '*', (q) => q.in('contest_id', ids)),
            selectAll(client, 'contest_topics', '*', (q) => q.in('contest_id', ids)),
          ])
        : [[], []]
      const subjectIds = [...new Set(contestSubjects.map((r) => r.subject_id))]
      const topicIds = [...new Set(contestTopics.map((r) => r.topic_id))]
      const [subjects, topics] = await Promise.all([
        subjectIds.length ? selectAll(client, 'subjects', '*', (q) => q.in('id', subjectIds)) : [],
        topicIds.length ? selectAll(client, 'topics', '*', (q) => q.in('id', topicIds)) : [],
      ])
      return {
        career: toCareer(posRow.careers),
        position: toPosition(posRow),
        contests,
        subjects: subjects.map(toSubject),
        topics: topics.map(toTopic),
        contestSubjects: contestSubjects.map((r): ContestSubject => ({ contestId: r.contest_id, subjectId: r.subject_id, weight: r.weight == null ? null : Number(r.weight), questionCount: r.question_count })),
        contestTopics: contestTopics.map((r): ContestTopic => ({ contestId: r.contest_id, topicId: r.topic_id, details: r.details ?? [] })),
      }
    },

    async createCareer({ name, description = '' }) {
      const row = must<Row>(
        await client
          .from('careers')
          .insert({ slug: `${slugify(name)}-${uuid().slice(0, 6)}`, name, description, is_custom: true, created_by: await userId() })
          .select()
          .single(),
      )
      return toCareer(row)
    },

    async createPosition({ careerId, name, description = '', spheres }) {
      const row = must<Row>(
        await client
          .from('positions')
          .insert({ career_id: careerId, name, description, spheres, is_custom: true, created_by: await userId() })
          .select()
          .single(),
      )
      return toPosition(row)
    },

    async importNotice(input) {
      const [subjects, topics] = await Promise.all([
        selectAll(client, 'subjects').then((rows) => rows.map(toSubject)),
        selectAll(client, 'topics').then((rows) => rows.map(toTopic)),
      ])
      const result = planNoticeImport(input, { subjects, topics }, uuid)
      const c = result.contest
      let examBoardId: string | null = null
      if (c.examBoard) {
        const board = must<Row | null>(await client.from('exam_boards').select('id').eq('name', c.examBoard).maybeSingle())
        examBoardId = board?.id ?? must<Row>(await client.from('exam_boards').insert({ name: c.examBoard }).select('id').single()).id
      }
      must(
        await client.from('contests').insert({
          id: c.id,
          position_id: c.positionId,
          name: c.name,
          organization: c.organization,
          organization_short: c.organizationShort,
          sphere: c.sphere,
          state: c.state,
          city: c.city,
          year: c.year,
          notice_url: c.noticeUrl,
          notice_date: c.noticeDate,
          exam_board_id: examBoardId,
          origin: c.origin,
          created_by: await userId(),
        }),
      )
      if (result.newSubjects.length)
        must(await client.from('subjects').insert(result.newSubjects.map((s) => ({ id: s.id, slug: s.slug, name: s.name, icon: s.icon }))))
      if (result.newTopics.length)
        must(await client.from('topics').insert(result.newTopics.map((t) => ({ id: t.id, subject_id: t.subjectId, name: t.name, sort_order: t.order }))))
      if (result.contestSubjects.length)
        must(
          await client
            .from('contest_subjects')
            .insert(result.contestSubjects.map((cs) => ({ contest_id: cs.contestId, subject_id: cs.subjectId, weight: cs.weight, question_count: cs.questionCount }))),
        )
      if (result.contestTopics.length)
        must(
          await client
            .from('contest_topics')
            .insert(result.contestTopics.map((ct) => ({ contest_id: ct.contestId, topic_id: ct.topicId, details: ct.details ?? [] }))),
        )
      return c
    },

    async getProfile() {
      return toProfile(must<Row>(await client.from('users').select('*').eq('id', await userId()).single()))
    },

    async updateProfile(patch) {
      return toProfile(must<Row>(await client.from('users').update(patch).eq('id', await userId()).select().single()))
    },

    async getSelection() {
      const row = must<Row | null>(await client.from('user_positions').select('*').eq('user_id', await userId()).eq('is_active', true).maybeSingle())
      return row ? ({ positionId: row.position_id, sphere: row.sphere, state: row.state, createdAt: row.created_at } satisfies UserSelection) : null
    },

    async setSelection(selection) {
      const id = await userId()
      must(await client.from('user_positions').update({ is_active: false }).eq('user_id', id).eq('is_active', true))
      if (!selection) return null
      const row = must<Row>(
        await client
          .from('user_positions')
          .insert({ user_id: id, position_id: selection.positionId, sphere: selection.sphere, state: selection.state, is_active: true })
          .select()
          .single(),
      )
      return { positionId: row.position_id, sphere: row.sphere, state: row.state, createdAt: row.created_at }
    },

    async listRecentSelections() {
      const rows = must<Row[]>(
        await client.from('user_positions').select('*').eq('user_id', await userId()).eq('forgotten', false).order('created_at', { ascending: false }).limit(100),
      )
      const seen = new Set<string>()
      return rows
        .filter((r) => !seen.has(r.position_id) && seen.add(r.position_id))
        .slice(0, 20)
        .map((r) => ({ positionId: r.position_id, sphere: r.sphere, state: r.state, createdAt: r.created_at }))
    },

    async forgetSelection(positionId) {
      must(await client.from('user_positions').update({ forgotten: true }).eq('user_id', await userId()).eq('position_id', positionId).eq('is_active', false))
    },

    async listUserTopics() {
      const id = await userId()
      return (await selectAll(client, 'user_topics', '*', (q) => q.eq('user_id', id))).map(toUserTopic)
    },

    async updateUserTopic(topicId, patch) {
      const values: Row = { user_id: await userId(), topic_id: topicId, updated_at: new Date().toISOString() }
      if (patch.status !== undefined) values.status = patch.status
      if (patch.lastStudiedAt !== undefined) values.last_studied_at = patch.lastStudiedAt
      if (patch.completedAt !== undefined) values.completed_at = patch.completedAt
      if (patch.lastAccessedAt !== undefined) values.last_accessed_at = patch.lastAccessedAt
      return toUserTopic(must<Row>(await client.from('user_topics').upsert(values, { onConflict: 'user_id,topic_id' }).select().single()))
    },

    async listSummaries() {
      const id = await userId()
      return (await selectAll(client, 'summaries', '*', (q) => q.eq('user_id', id))).map(toSummary)
    },

    async saveSummary(topicId: string, content: SummaryContent) {
      const row = must<Row>(
        await client
          .from('summaries')
          .upsert(
            {
              user_id: await userId(),
              topic_id: topicId,
              content,
              plain_text: htmlToText(Object.values(content).join(' ')),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,topic_id' },
          )
          .select()
          .single(),
      )
      return toSummary(row)
    },

    async deleteSummary(topicId) {
      must(await client.from('summaries').delete().eq('user_id', await userId()).eq('topic_id', topicId))
    },

    async resetUserData() {
      const id = await userId()
      await Promise.all(['user_topics', 'summaries', 'user_positions'].map(async (t) => must(await client.from(t).delete().eq('user_id', id))))
      removeKey(ANON_USER_KEY)
      userIdPromise = null
    },
  }
}
