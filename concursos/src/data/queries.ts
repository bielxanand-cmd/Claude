import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { consolidateStudyPlan } from '@/domain/consolidate'
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
      const snapshot = await dataSource.getCatalogSnapshot(positionId!)
      return snapshot ? consolidateStudyPlan(snapshot) : null
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

export function useResetData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => dataSource.resetUserData(),
    onSuccess: () => qc.clear(),
  })
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
