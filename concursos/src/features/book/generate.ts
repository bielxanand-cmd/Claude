import { aiSummaryPrompt, extractiveSummary, parseAiSummary, type RelevantExcerpt } from '@/domain/book'
import type { SummaryContent } from '@/domain/types'
import type { ClaudeSample } from '@/features/ai/claude-sample'

export type FillMode = 'ai' | 'extract'

export interface FillInput {
  mode: FillMode
  bookName: string
  topicName: string
  subjectName: string
  positionName: string
  details: string[]
  excerpt: RelevantExcerpt
  sample: ClaudeSample | null
  signal?: AbortSignal
}

/** Conteúdo dos campos do resumo a partir do trecho do livro. */
export async function contentFromBook(input: FillInput): Promise<SummaryContent> {
  if (input.mode === 'ai' && input.sample) {
    const value = await input.sample.json(aiSummaryPrompt(input), { modelTier: 'default', signal: input.signal })
    const parsed = parseAiSummary(value)
    if (!parsed) throw { code: 'invalid_json', message: 'resposta sem campos' }
    return parsed
  }
  return extractiveSummary(input)
}
