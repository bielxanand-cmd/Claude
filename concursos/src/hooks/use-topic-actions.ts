import { useCallback } from 'react'
import { toast } from 'sonner'
import { statusPatch, useUpdateTopic } from '@/data/queries'
import type { TopicStatus } from '@/domain/types'
import { celebrate } from '@/lib/confetti'

/** Ações de status de um assunto com feedback visual (toast + confete). */
export function useTopicActions() {
  const update = useUpdateTopic()

  const setStatus = useCallback(
    (topicId: string, status: TopicStatus, origin?: Element | null) => {
      update.mutate(
        { topicId, patch: statusPatch(status) },
        { onError: () => toast.error('Não foi possível salvar o status. Tente novamente.') },
      )
      if (status === 'completed') {
        celebrate(origin)
        toast.success('Assunto concluído!', { description: 'Seu progresso foi atualizado.' })
      } else if (status === 'in_progress') {
        toast('Assunto em andamento', { description: 'Bons estudos!' })
      }
    },
    [update],
  )

  const touch = useCallback(
    (topicId: string) => update.mutate({ topicId, patch: { lastAccessedAt: new Date().toISOString() } }),
    [update],
  )

  return { setStatus, touch }
}
