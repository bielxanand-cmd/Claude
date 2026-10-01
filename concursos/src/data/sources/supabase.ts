import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Flashcard } from '@/domain/flashcards'
import type { Quiz } from '@/domain/questions'
import type { Theme } from '@/domain/themes'
import type { Attachment } from '@/domain/attachments'
import type { QuestionNote } from '@/domain/question-notes'
import type { ManualTopic } from '@/domain/manual-topics'
import type { ExamAnalysis } from '@/domain/exam-analysis'
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
const toFlashcard = (r: Row): Flashcard => ({
  id: r.id,
  topicId: r.topic_id,
  front: r.front,
  back: r.back,
  context: r.context,
  kind: r.kind,
  source: r.source,
  createdAt: r.created_at,
  review: {
    ease: Number(r.ease_factor),
    intervalDays: r.interval_days,
    reps: r.reps,
    lapses: r.lapses,
    dueAt: r.due_at,
    lastReviewedAt: r.last_reviewed_at,
  },
})
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

    async deleteContest(contestId) {
      // contest_subjects/contest_topics saem em cascata; disciplinas e assuntos ficam (podem ser de outros editais)
      must(await client.from('contests').delete().eq('id', contestId).eq('created_by', await userId()))
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

    async listFlashcards() {
      const id = await userId()
      return (await selectAll(client, 'flashcards', '*', (q) => q.eq('user_id', id))).map(toFlashcard)
    },

    async saveTopicFlashcards(topicId, cards) {
      const id = await userId()
      must(await client.from('flashcards').delete().eq('user_id', id).eq('topic_id', topicId))
      if (cards.length === 0) return []
      const rows = must<Row[]>(
        await client
          .from('flashcards')
          .insert(
            cards.map((c) => ({
              id: c.id,
              user_id: id,
              topic_id: topicId,
              front: c.front,
              back: c.back,
              context: c.context,
              kind: c.kind,
              source: c.source,
              created_at: c.createdAt,
              ease_factor: c.review.ease,
              interval_days: c.review.intervalDays,
              reps: c.review.reps,
              lapses: c.review.lapses,
              due_at: c.review.dueAt,
              last_reviewed_at: c.review.lastReviewedAt,
            })),
          )
          .select(),
      )
      return rows.map(toFlashcard)
    },

    // Questões geradas ficam em ai_generations (kind = 'questions'), uma por assunto
    async listQuizzes() {
      const id = await userId()
      const rows = await selectAll(client, 'ai_generations', '*', (q) => q.eq('user_id', id).eq('kind', 'questions'))
      return rows.map((r) => r.output as Quiz).filter((q) => q?.topicId)
    },

    async saveQuiz(topicId, quiz) {
      const id = await userId()
      must(await client.from('ai_generations').delete().eq('user_id', id).eq('kind', 'questions').eq('topic_id', topicId))
      if (quiz) must(await client.from('ai_generations').insert({ user_id: id, topic_id: topicId, kind: 'questions', output: quiz }))
      return quiz
    },

    async listThemes() {
      const id = await userId()
      const rows = await selectAll(client, 'topic_themes', '*', (q) => q.eq('user_id', id))
      return rows.map(
        (r): Theme => ({
          id: r.id as string,
          topicId: r.topic_id as string,
          title: r.title as string,
          parentId: (r.parent_id as string | null) ?? null,
          summary: (r.summary_html as string) ?? '',
          keyPoints: (r.key_points_html as string) ?? '',
          order: (r.position as number) ?? 0,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        }),
      )
    },

    async saveTheme(theme) {
      const id = await userId()
      const updatedAt = new Date().toISOString()
      must(
        await client.from('topic_themes').upsert({
          id: theme.id,
          user_id: id,
          topic_id: theme.topicId,
          title: theme.title,
          parent_id: theme.parentId ?? null,
          summary_html: theme.summary,
          key_points_html: theme.keyPoints,
          plain_text: `${theme.title}\n${htmlToText(theme.summary)}\n${htmlToText(theme.keyPoints)}`,
          position: theme.order,
          created_at: theme.createdAt,
          updated_at: updatedAt,
        }),
      )
      return { ...theme, updatedAt }
    },

    async listExamAnalyses() {
      const id = await userId()
      const rows = await selectAll(client, 'user_exam_analyses', '*', (q) => q.eq('user_id', id))
      return rows.map((r) => r.result as ExamAnalysis).filter((e) => e?.id)
    },

    async saveExamAnalysis(exam) {
      must(await client.from('user_exam_analyses').upsert({ id: exam.id, user_id: await userId(), position_id: exam.positionId, result: exam, created_at: exam.createdAt }))
      return exam
    },

    async deleteExamAnalysis(examId) {
      must(await client.from('user_exam_analyses').delete().eq('user_id', await userId()).eq('id', examId))
    },

    async listManualTopics() {
      const id = await userId()
      const rows = await selectAll(client, 'user_manual_topics', '*', (q) => q.eq('user_id', id))
      return rows.map(
        (r): ManualTopic => ({
          id: r.id as string,
          positionId: r.position_id as string,
          subjectId: r.subject_id as string,
          name: r.name as string,
          details: (r.details as string[]) ?? [],
          createdAt: r.created_at as string,
        }),
      )
    },

    async createManualTopic(input) {
      const topic: ManualTopic = { ...input, id: `manual-${uuid()}`, createdAt: new Date().toISOString() }
      must(
        await client.from('user_manual_topics').insert({
          id: topic.id,
          user_id: await userId(),
          position_id: topic.positionId,
          subject_id: topic.subjectId,
          name: topic.name,
          details: topic.details,
          created_at: topic.createdAt,
        }),
      )
      return topic
    },

    async deleteManualTopic(topicId) {
      must(await client.from('user_manual_topics').delete().eq('user_id', await userId()).eq('id', topicId))
    },

    async listQuestionNotes() {
      const id = await userId()
      const rows = await selectAll(client, 'topic_question_notes', '*', (q) => q.eq('user_id', id))
      return rows.map(
        (r): QuestionNote => ({
          id: r.id as string,
          topicId: r.topic_id as string,
          themeId: (r.theme_id as string | null) ?? null,
          subthemeId: (r.subtheme_id as string | null) ?? null,
          html: (r.content_html as string) ?? '',
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        }),
      )
    },

    async saveQuestionNote(note) {
      const id = await userId()
      const updatedAt = new Date().toISOString()
      must(
        await client.from('topic_question_notes').upsert({
          id: note.id,
          user_id: id,
          topic_id: note.topicId,
          theme_id: note.themeId,
          subtheme_id: note.subthemeId,
          content_html: note.html,
          plain_text: htmlToText(note.html),
          created_at: note.createdAt,
          updated_at: updatedAt,
        }),
      )
      return { ...note, updatedAt }
    },

    async deleteQuestionNote(topicId, noteId) {
      const id = await userId()
      must(await client.from('topic_question_notes').delete().eq('user_id', id).eq('topic_id', topicId).eq('id', noteId))
    },

    // Fichas dos anexos; os arquivos ficam no navegador (IndexedDB) neste modo
    async listAttachments() {
      const id = await userId()
      const rows = await selectAll(client, 'topic_attachments', '*', (q) => q.eq('user_id', id))
      return rows.map(
        (r): Attachment => ({
          id: r.id as string,
          topicId: r.topic_id as string,
          name: r.name as string,
          type: r.content_type as string,
          size: r.size_bytes as number,
          blobId: r.blob_id as string,
          createdAt: r.created_at as string,
        }),
      )
    },

    async saveAttachment(item) {
      const id = await userId()
      must(
        await client.from('topic_attachments').upsert({
          id: item.id,
          user_id: id,
          topic_id: item.topicId,
          name: item.name,
          content_type: item.type,
          size_bytes: item.size,
          blob_id: item.blobId,
          created_at: item.createdAt,
        }),
      )
      return item
    },

    async deleteAttachment(topicId, attachmentId) {
      const id = await userId()
      must(await client.from('topic_attachments').delete().eq('user_id', id).eq('topic_id', topicId).eq('id', attachmentId))
    },

    async deleteTheme(topicId, themeId) {
      const id = await userId()
      must(await client.from('topic_themes').delete().eq('user_id', id).eq('topic_id', topicId).eq('id', themeId))
    },

    async resetUserData() {
      const id = await userId()
      await Promise.all(['user_topics', 'summaries', 'user_positions', 'flashcards', 'ai_generations'].map(async (t) => must(await client.from(t).delete().eq('user_id', id))))
      removeKey(ANON_USER_KEY)
      userIdPromise = null
    },
  }
}
