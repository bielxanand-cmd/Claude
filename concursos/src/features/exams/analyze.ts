import {
  aiClassifyPrompt,
  classifyQuestions,
  countLabels,
  parseAiLabels,
  planCatalog,
  splitQuestions,
  type ExamAnalysis,
  type QuestionLabel,
} from '@/domain/exam-analysis'
import { detectNoticeMetadata } from '@/domain/notice-parser'
import type { StudyPlan } from '@/domain/types'
import type { ClaudeSample } from '@/features/ai/claude-sample'
import { extractPdfText } from '@/features/import/pdf-text'
import { uuid } from '@/lib/storage'

export type AnalyzeProgress = { stage: 'read'; done: number; total: number } | { stage: 'classify'; done: number; total: number }

const BATCH = 20

export class NoQuestionsError extends Error {}

/** Lê a prova em PDF, separa e classifica as questões e devolve o resultado pronto para salvar. */
export async function analyzeExamFile(input: {
  file: File
  plan: StudyPlan
  sample: ClaudeSample | null
  signal?: AbortSignal
  onProgress?: (p: AnalyzeProgress) => void
}): Promise<ExamAnalysis> {
  const { file, plan, sample, signal, onProgress } = input
  const { pages } = await extractPdfText(file, (done, total) => onProgress?.({ stage: 'read', done, total }))
  const questions = splitQuestions(pages)
  if (questions.length === 0) throw new NoQuestionsError('Não encontramos questões numeradas neste PDF.')

  const auto = classifyQuestions(questions, plan.subjects)
  let labels: QuestionLabel[] = auto
  if (sample) {
    const catalog = planCatalog(plan.subjects).text
    labels = []
    const batches = Math.ceil(questions.length / BATCH)
    for (let b = 0; b < batches; b++) {
      onProgress?.({ stage: 'classify', done: b, total: batches })
      const slice = questions.slice(b * BATCH, (b + 1) * BATCH)
      try {
        const value = await sample.json(aiClassifyPrompt({ position: plan.position.name, catalog, questions: slice }), { modelTier: 'default', signal })
        labels.push(...parseAiLabels(value, slice, plan.subjects))
      } catch (e) {
        if ((e as { code?: string })?.code === 'cancelled' || signal?.aborted) throw e
        // Lote que falhou: usa a classificação automática dessas questões
        labels.push(...auto.slice(b * BATCH, (b + 1) * BATCH))
      }
    }
    onProgress?.({ stage: 'classify', done: batches, total: batches })
  }

  const meta = detectNoticeMetadata(pages.slice(0, 2).join('\n'))
  const yearInName = file.name.match(/\b(19|20)\d{2}\b/)?.[0]
  return {
    id: uuid(),
    positionId: plan.position.id,
    name: file.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim(),
    year: yearInName ? Number(yearInName) : (meta.year ?? null),
    examBoard: meta.examBoard ?? null,
    method: sample ? 'ai' : 'auto',
    createdAt: new Date().toISOString(),
    totalQuestions: questions.length,
    subjects: countLabels(labels),
  }
}
