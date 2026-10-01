import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { consolidateStudyPlan } from '@/domain/consolidate'
import type { Flashcard } from '@/domain/flashcards'
import type { Quiz } from '@/domain/questions'
import type { Theme } from '@/domain/themes'
import type { Attachment } from '@/domain/attachments'
import type { QuestionNote } from '@/domain/question-notes'
import { withManualTopics, type ManualTopic } from '@/domain/manual-topics'
import type { ExamAnalysis } from '@/domain/exam-analysis'
import { toStatusMap } from '@/domain/progress'
import type {
  Contest,
  NoticeImport,
  PlanSubject,
  PlanTopic,
  Sphere,
  StudyPlan,
  Summary,
  SummaryContent,
  TopicStatus,
  UserSelection,
  UserTopic,
} from '@/domain/types'
import { dataSource, type PositionFilter } from './sources'

export const queryKeys = {
  careers: ['careers'] as const,
  positions: (filter: PositionFilter) => ['positions', filter] as const,
  plan: (positionId: string) => ['plan', positionId] as const,
  selection: ['selection'] as const,
  recentSelections: ['recent-selections'] as const,
  profile: ['profile'] as const,
  userTopics: ['user-topics'] as const,
  summaries: ['summaries'] as const,
  flashcards: ['flashcards'] as const,
  quizzes: ['quizzes'] as const,
  themes: ['themes'] as const,
  attachments: ['attachments'] as const,
  questionNotes: ['question-notes'] as const,
  examAnalyses: ['exam-analyses'] as const,
}

/* ------------------------------------------------------------------ Catálogo */

export const useCareers = () => useQuery({ queryKey: queryKeys.careers, queryFn: () => dataSource.listCareers() })

export const usePositions = (filter: PositionFilter, enabled = true) =>
  useQuery({ queryKey: queryKeys.positions(filter), queryFn: () => dataSource.listPositions(filter), enabled })

export const usePlan = (positionId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.plan(positionId ?? ''),
    enabled: !!positionId,
    queryFn: async (): Promise<StudyPlan | null> => {
      const [snapshot, manual] = await Promise.all([dataSource.getCatalogSnapshot(positionId!), dataSource.listManualTopics()])
      return snapshot ? withManualTopics(consolidateStudyPlan(snapshot), manual) : null
    },
  })

export function useImportNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NoticeImport) => dataSource.importNotice(input),
    onSuccess: (_contest, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.plan(input.positionId) })
      qc.invalidateQueries({ queryKey: ['positions'] })
    },
  })
}

export function useDeleteContest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contestId }: { contestId: string; positionId: string }) => dataSource.deleteContest(contestId),
    onSuccess: (_r, { positionId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.plan(positionId) })
      qc.invalidateQueries({ queryKey: ['positions'] })
    },
  })
}

export const useExamAnalyses = () => useQuery({ queryKey: queryKeys.examAnalyses, queryFn: () => dataSource.listExamAnalyses() })

export function useSaveExamAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (exam: ExamAnalysis) => dataSource.saveExamAnalysis(exam),
    onSuccess: (exam) => qc.setQueryData<ExamAnalysis[]>(queryKeys.examAnalyses, (list = []) => [...list.filter((e) => e.id !== exam.id), exam]),
  })
}

export function useDeleteExamAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dataSource.deleteExamAnalysis(id),
    onMutate: (id) => {
      const previous = qc.getQueryData<ExamAnalysis[]>(queryKeys.examAnalyses)
      qc.setQueryData<ExamAnalysis[]>(queryKeys.examAnalyses, (list = []) => list.filter((e) => e.id !== id))
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.examAnalyses, context?.previous),
  })
}

/** Cria um assunto manual numa disciplina do plano. */
export function useCreateManualTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ManualTopic, 'id' | 'createdAt'>) => dataSource.createManualTopic(input),
    onSuccess: (topic) => qc.invalidateQueries({ queryKey: queryKeys.plan(topic.positionId) }),
  })
}

export function useDeleteManualTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId }: { topicId: string; positionId: string }) => dataSource.deleteManualTopic(topicId),
    onSuccess: (_r, { positionId }) => qc.invalidateQueries({ queryKey: queryKeys.plan(positionId) }),
  })
}

export function useCreateCustomPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { careerId?: string; careerName?: string; positionName: string; spheres: Sphere[] }) => {
      const careerId = input.careerId ?? (await dataSource.createCareer({ name: input.careerName ?? 'Outra carreira' })).id
      return dataSource.createPosition({ careerId, name: input.positionName, spheres: input.spheres })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.careers })
      qc.invalidateQueries({ queryKey: ['positions'] })
    },
  })
}

/* ------------------------------------------------------------------ Usuário */

export const useProfile = () => useQuery({ queryKey: queryKeys.profile, queryFn: () => dataSource.getProfile() })

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { name?: string; email?: string | null }) => dataSource.updateProfile(patch),
    onSuccess: (profile) => qc.setQueryData(queryKeys.profile, profile),
  })
}

export const useSelection = () => useQuery({ queryKey: queryKeys.selection, queryFn: () => dataSource.getSelection() })

export function useSetSelection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (selection: Omit<UserSelection, 'createdAt'> | null) => dataSource.setSelection(selection),
    onSuccess: (selection) => {
      qc.setQueryData(queryKeys.selection, selection)
      qc.invalidateQueries({ queryKey: queryKeys.recentSelections })
    },
  })
}

export const useRecentSelections = () => useQuery({ queryKey: queryKeys.recentSelections, queryFn: () => dataSource.listRecentSelections() })

export function useForgetSelection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (positionId: string) => dataSource.forgetSelection(positionId),
    onSuccess: (_v, positionId) =>
      qc.setQueryData<UserSelection[]>(queryKeys.recentSelections, (list = []) => list.filter((s) => s.positionId !== positionId)),
  })
}

export const useUserTopics = () => useQuery({ queryKey: queryKeys.userTopics, queryFn: () => dataSource.listUserTopics() })

function patchUserTopics(list: UserTopic[] | undefined, topicId: string, patch: Partial<UserTopic>): UserTopic[] {
  const current = list ?? []
  const existing = current.find((t) => t.topicId === topicId)
  const base: UserTopic = existing ?? { topicId, status: 'not_started', lastStudiedAt: null, completedAt: null, lastAccessedAt: null }
  return [...current.filter((t) => t.topicId !== topicId), { ...base, ...patch }]
}

/** Atualiza status/acesso de um assunto com atualização otimista (progresso muda na hora). */
export function useUpdateTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, patch }: { topicId: string; patch: Partial<Omit<UserTopic, 'topicId'>> }) =>
      dataSource.updateUserTopic(topicId, patch),
    onMutate: async ({ topicId, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.userTopics })
      const previous = qc.getQueryData<UserTopic[]>(queryKeys.userTopics)
      qc.setQueryData<UserTopic[]>(queryKeys.userTopics, (list) => patchUserTopics(list, topicId, patch))
      return { previous }
    },
    onError: (_err, _vars, context) => qc.setQueryData(queryKeys.userTopics, context?.previous),
    onSuccess: (saved) => qc.setQueryData<UserTopic[]>(queryKeys.userTopics, (list) => patchUserTopics(list, saved.topicId, saved)),
  })
}

export function statusPatch(status: TopicStatus): Partial<UserTopic> {
  const now = new Date().toISOString()
  return {
    status,
    lastStudiedAt: status === 'not_started' ? null : now,
    completedAt: status === 'completed' ? now : null,
  }
}

export const useSummaries = () => useQuery({ queryKey: queryKeys.summaries, queryFn: () => dataSource.listSummaries() })

export function useSaveSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, content }: { topicId: string; content: SummaryContent }) => dataSource.saveSummary(topicId, content),
    onSuccess: (summary) =>
      qc.setQueryData<Summary[]>(queryKeys.summaries, (list = []) => [...list.filter((s) => s.topicId !== summary.topicId), summary]),
  })
}

export function useDeleteSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (topicId: string) => dataSource.deleteSummary(topicId),
    onSuccess: (_v, topicId) => qc.setQueryData<Summary[]>(queryKeys.summaries, (list = []) => list.filter((s) => s.topicId !== topicId)),
  })
}

export const useFlashcards = () => useQuery({ queryKey: queryKeys.flashcards, queryFn: () => dataSource.listFlashcards() })

/** Salva o baralho de um assunto com atualização otimista (revisões fluem sem espera). */
export function useSaveTopicFlashcards() {
  const qc = useQueryClient()
  const replace = (list: Flashcard[] = [], topicId: string, cards: Flashcard[]) => [...list.filter((c) => c.topicId !== topicId), ...cards]
  return useMutation({
    mutationFn: ({ topicId, cards }: { topicId: string; cards: Flashcard[] }) => dataSource.saveTopicFlashcards(topicId, cards),
    onMutate: async ({ topicId, cards }) => {
      await qc.cancelQueries({ queryKey: queryKeys.flashcards })
      const previous = qc.getQueryData<Flashcard[]>(queryKeys.flashcards)
      qc.setQueryData<Flashcard[]>(queryKeys.flashcards, (list) => replace(list, topicId, cards))
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.flashcards, context?.previous),
  })
}

export const useQuizzes = () => useQuery({ queryKey: queryKeys.quizzes, queryFn: () => dataSource.listQuizzes() })

/** Salva as questões de um assunto (otimista: a correção aparece na hora). */
export function useSaveQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, quiz }: { topicId: string; quiz: Quiz | null }) => dataSource.saveQuiz(topicId, quiz),
    onMutate: async ({ topicId, quiz }) => {
      await qc.cancelQueries({ queryKey: queryKeys.quizzes })
      const previous = qc.getQueryData<Quiz[]>(queryKeys.quizzes)
      qc.setQueryData<Quiz[]>(queryKeys.quizzes, (list = []) => [...list.filter((q) => q.topicId !== topicId), ...(quiz ? [quiz] : [])])
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.quizzes, context?.previous),
  })
}

export const useThemes = () => useQuery({ queryKey: queryKeys.themes, queryFn: () => dataSource.listThemes() })

/** Cria/atualiza um tema (otimista: a lista muda na hora). */
export function useSaveTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (theme: Theme) => dataSource.saveTheme(theme),
    onMutate: async (theme) => {
      await qc.cancelQueries({ queryKey: queryKeys.themes })
      const previous = qc.getQueryData<Theme[]>(queryKeys.themes)
      qc.setQueryData<Theme[]>(queryKeys.themes, (list = []) => [...list.filter((t) => t.id !== theme.id), theme])
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.themes, context?.previous),
  })
}

export function useDeleteTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, themeId }: { topicId: string; themeId: string }) => dataSource.deleteTheme(topicId, themeId),
    onMutate: async ({ themeId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.themes })
      const previous = qc.getQueryData<Theme[]>(queryKeys.themes)
      qc.setQueryData<Theme[]>(queryKeys.themes, (list = []) => list.filter((t) => t.id !== themeId))
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.themes, context?.previous),
  })
}

export const useQuestionNotes = () => useQuery({ queryKey: queryKeys.questionNotes, queryFn: () => dataSource.listQuestionNotes() })

export function useSaveQuestionNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note: QuestionNote) => dataSource.saveQuestionNote(note),
    onMutate: async (note) => {
      await qc.cancelQueries({ queryKey: queryKeys.questionNotes })
      const previous = qc.getQueryData<QuestionNote[]>(queryKeys.questionNotes)
      qc.setQueryData<QuestionNote[]>(queryKeys.questionNotes, (list = []) => [...list.filter((n) => n.id !== note.id), note])
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.questionNotes, context?.previous),
  })
}

export function useDeleteQuestionNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, noteId }: { topicId: string; noteId: string }) => dataSource.deleteQuestionNote(topicId, noteId),
    onMutate: async ({ noteId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.questionNotes })
      const previous = qc.getQueryData<QuestionNote[]>(queryKeys.questionNotes)
      qc.setQueryData<QuestionNote[]>(queryKeys.questionNotes, (list = []) => list.filter((n) => n.id !== noteId))
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.questionNotes, context?.previous),
  })
}

export const useAttachments = () => useQuery({ queryKey: queryKeys.attachments, queryFn: () => dataSource.listAttachments() })

export function useSaveAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: Attachment) => dataSource.saveAttachment(item),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: queryKeys.attachments })
      const previous = qc.getQueryData<Attachment[]>(queryKeys.attachments)
      qc.setQueryData<Attachment[]>(queryKeys.attachments, (list = []) => [...list.filter((a) => a.id !== item.id), item])
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.attachments, context?.previous),
  })
}

export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, attachmentId }: { topicId: string; attachmentId: string }) => dataSource.deleteAttachment(topicId, attachmentId),
    onMutate: async ({ attachmentId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.attachments })
      const previous = qc.getQueryData<Attachment[]>(queryKeys.attachments)
      qc.setQueryData<Attachment[]>(queryKeys.attachments, (list = []) => list.filter((a) => a.id !== attachmentId))
      return { previous }
    },
    onError: (_e, _v, context) => qc.setQueryData(queryKeys.attachments, context?.previous),
  })
}

export function useResetData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => dataSource.resetUserData(),
    onSuccess: () => qc.clear(),
  })
}

/** Mantém a tela atualizada quando o progresso muda em outra aba/aparelho. */
export function useRemoteSync() {
  const qc = useQueryClient()
  useEffect(
    () =>
      dataSource.subscribe?.((what) => {
        if (what === 'userTopics') void qc.invalidateQueries({ queryKey: queryKeys.userTopics })
        else void qc.invalidateQueries()
      }),
    [qc],
  )

  // Ao voltar para o app (trocou de aba/aparelho) e a cada minuto com a
  // página aberta, busca na conta o que foi feito em outro aparelho
  useEffect(() => {
    if (!dataSource.refresh) return
    let last = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 5_000) return
      last = Date.now()
      void dataSource.refresh!()
    }
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
}

/* ------------------------------------------------------------------ Agregado */

export interface TopicRef {
  subject: PlanSubject
  planTopic: PlanTopic
}

/**
 * Tudo que as telas de estudo precisam: cargo selecionado, plano consolidado,
 * status dos assuntos e resumos — com índices para consultas rápidas.
 */
export function useStudy() {
  const selection = useSelection()
  const plan = usePlan(selection.data?.positionId)
  const userTopics = useUserTopics()
  const summaries = useSummaries()

  const derived = useMemo(() => {
    const topicIndex = new Map<string, TopicRef>()
    const subjectIndex = new Map<string, PlanSubject>()
    const contestIndex = new Map<string, Contest>()
    for (const subject of plan.data?.subjects ?? []) {
      subjectIndex.set(subject.subject.id, subject)
      for (const planTopic of subject.topics) topicIndex.set(planTopic.topic.id, { subject, planTopic })
    }
    for (const contest of plan.data?.contests ?? []) contestIndex.set(contest.id, contest)
    const summaryIndex = new Map((summaries.data ?? []).map((s) => [s.topicId, s]))
    return { topicIndex, subjectIndex, contestIndex, summaryIndex, statuses: toStatusMap(userTopics.data ?? []) }
  }, [plan.data, summaries.data, userTopics.data])

  const queries = [selection, plan, userTopics, summaries]
  const isLoading = selection.isLoading || (!!selection.data && plan.isLoading) || userTopics.isLoading || summaries.isLoading
  const error = queries.find((q) => q.error)?.error ?? null

  return {
    selection: selection.data ?? null,
    plan: plan.data ?? null,
    userTopics: userTopics.data ?? [],
    summaries: summaries.data ?? [],
    ...derived,
    isLoading,
    error,
    refetch: () => queries.forEach((q) => q.refetch()),
  }
}

export type Study = ReturnType<typeof useStudy>
