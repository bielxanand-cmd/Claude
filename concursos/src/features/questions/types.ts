/**
 * Tipos preparados para o futuro módulo de questões (tabelas `questions` e
 * `question_attempts` já existem no schema). Questões se ligam a assunto,
 * disciplina, edital (cargo) e banca, permitindo filtros por qualquer um deles.
 */
export interface QuestionOption {
  key: string
  text: string
}

export interface Question {
  id: string
  topicId: string | null
  subjectId: string | null
  contestId: string | null
  examBoard: string | null
  year: number | null
  statement: string
  options: QuestionOption[]
  correctOption: string | null
  explanation: string | null
}

export interface QuestionAttempt {
  id: string
  questionId: string
  selected: string | null
  isCorrect: boolean
  answeredAt: string
}

export interface QuestionFilter {
  positionId?: string
  subjectId?: string
  topicId?: string
  examBoard?: string
  year?: number
}

export interface PerformanceStats {
  answered: number
  correct: number
  wrong: number
  /** 0–1 */
  accuracy: number
}

export function computePerformance(attempts: Pick<QuestionAttempt, 'isCorrect'>[]): PerformanceStats {
  const correct = attempts.filter((a) => a.isCorrect).length
  return { answered: attempts.length, correct, wrong: attempts.length - correct, accuracy: attempts.length ? correct / attempts.length : 0 }
}
