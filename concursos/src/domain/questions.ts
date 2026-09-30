import { normalize } from '@/lib/text'
import { parseHtml, textOf, type HtmlNode } from './html'
import { splitSentences } from './sentences'
import type { SummaryContent } from './types'

/**
 * Questões de um assunto: geração automática (Certo/Errado a partir das
 * anotações) ou pelo Claude (Certo/Errado ou múltipla escolha), correção e
 * desempenho.
 */

export type QuestionStyle = 'true_false' | 'multiple_choice'

export interface QuizQuestion {
  id: string
  style: QuestionStyle
  statement: string
  /** Certo/Errado: ["Certo", "Errado"]; múltipla escolha: 4–5 alternativas */
  options: string[]
  /** Índice da alternativa correta */
  answer: number
  explanation: string
  /** Última resposta do usuário (índice) */
  chosen: number | null
}

export interface Quiz {
  topicId: string
  source: 'auto' | 'ai'
  style: QuestionStyle
  generatedAt: string
  questions: QuizQuestion[]
  /** Histórico acumulado de respostas neste assunto */
  answered: number
  correct: number
}

export const TRUE_FALSE_OPTIONS = ['Certo', 'Errado']

/* -------------------------------------------------------------------------- */
/* Geração automática (sem IA): Certo/Errado                                  */
/* -------------------------------------------------------------------------- */

/** Trocas que invertem o sentido de uma afirmação (nos dois sentidos). */
const SWAPS: [RegExp, string][] = [
  [/\bnão pode\b/i, 'pode'],
  [/\bnão cabe\b/i, 'cabe'],
  [/\bnão se aplica\b/i, 'se aplica'],
  [/\bnão é\b/i, 'é'],
  [/\bsempre\b/i, 'nunca'],
  [/\bnunca\b/i, 'sempre'],
  [/\bobrigatóri([oa])\b/i, 'facultativ$1'],
  [/\bfacultativ([oa])\b/i, 'obrigatóri$1'],
  [/\bvedad([oa])\b/i, 'permitid$1'],
  [/\bpermitid([oa])\b/i, 'vedad$1'],
  [/\bexclusiv([oa])\b/i, 'concorrente'],
  [/\bprivativ([oa])\b/i, 'comum'],
  [/\bgratuit([oa])\b/i, 'oneros$1'],
  [/\bmaioria absoluta\b/i, 'maioria simples'],
  [/\bmaioria simples\b/i, 'maioria absoluta'],
  [/\btrês quintos\b/i, 'dois terços'],
  [/\bdois terços\b/i, 'três quintos'],
  [/\bfederal\b/i, 'estadual'],
  [/\bmenor\b/i, 'maior'],
  [/\bmaior\b/i, 'menor'],
  [/\bsomente\b/i, 'inclusive'],
  [/\bapenas\b/i, 'também'],
]

/** Versão errada de uma afirmação: troca um número ou inverte o sentido. `null` se não der. */
export function falsify(sentence: string): string | null {
  // 1. Números (prazos, quóruns, artigos): troca por outro plausível
  const num = sentence.match(/\b(\d{1,4})(?=\s*(dias?|meses|anos?|horas?|%|membros|votos|turnos?)\b)/i)
  if (num) {
    const n = Number(num[1])
    const other = n === 1 ? 2 : n <= 5 ? n + 1 : n % 30 === 0 ? n + 30 : Math.round(n * 2)
    return sentence.replace(num[0], String(other))
  }
  // 2. Palavras que invertem o sentido
  for (const [pattern, replacement] of SWAPS) {
    if (pattern.test(sentence)) {
      const out = sentence.replace(pattern, (m) => {
        const r = m.replace(pattern, replacement)
        return m[0] === m[0].toUpperCase() ? r.charAt(0).toUpperCase() + r.slice(1) : r
      })
      if (out !== sentence) return out
    }
  }
  // 3. Negação simples: "X é Y" → "X não é Y"
  // (\b não reconhece letras acentuadas como "é"; por isso os limites com \p{L})
  const neg = sentence.replace(/(?<!\p{L})(é|são|pode|podem|cabe|deve|devem|compete|possui)(?!\p{L})/iu, 'não $1')
  return neg !== sentence ? neg : null
}

/** Afirmações do resumo (itens de lista, frases e "Tema: explicação"). */
function statements(content: SummaryContent): string[] {
  const out: string[] = []
  const visit = (nodes: (HtmlNode | string)[]) => {
    for (const node of nodes) {
      if (typeof node === 'string') continue
      if (node.tag === 'li' || node.tag === 'p' || node.tag === 'blockquote') {
        const text = textOf(node).replace(/\s+/g, ' ').trim()
        for (const s of splitSentences(text)) {
          // "Tema: explicação" vira "Tema — explicação" para ficar uma afirmação completa
          const clean = s.replace(/[\s.;]+$/, '').replace(/^(.{2,60}?):\s+/, '$1: ')
          if (clean.length >= 25 && clean.length <= 300 && /\p{Ll}/u.test(clean)) out.push(clean)
        }
        if (node.tag === 'li') visit(node.children.filter((c) => typeof c !== 'string' && (c.tag === 'ul' || c.tag === 'ol')))
        continue
      }
      visit(node.children)
    }
  }
  for (const key of ['summary', 'keyPoints', 'pitfalls'] as const) visit(parseHtml(content[key] ?? '').children)
  return [...new Map(out.map((s) => [normalize(s), s])).values()]
}

/**
 * Certo/Errado a partir das anotações: metade das afirmações como estão
 * (certas) e metade alteradas (erradas), com a versão correta no gabarito.
 */
export function generateTrueFalse(topicId: string, content: SummaryContent, newId: () => string, max = 10): QuizQuestion[] {
  const pool = statements(content)
  const questions: QuizQuestion[] = []
  pool.forEach((s, i) => {
    if (questions.length >= max) return
    const makeFalse = i % 2 === 1
    const wrong = makeFalse ? falsify(s) : null
    if (makeFalse && wrong) {
      questions.push({
        id: newId(),
        style: 'true_false',
        statement: `${wrong}.`,
        options: TRUE_FALSE_OPTIONS,
        answer: 1,
        explanation: `Errado. O correto, segundo as suas anotações: “${s}.”`,
        chosen: null,
      })
    } else {
      questions.push({
        id: newId(),
        style: 'true_false',
        statement: `${s}.`,
        options: TRUE_FALSE_OPTIONS,
        answer: 0,
        explanation: 'Certo. A afirmação reproduz as suas anotações.',
        chosen: null,
      })
    }
  })
  void topicId
  return questions
}

/* -------------------------------------------------------------------------- */
/* Geração com o Claude                                                       */
/* -------------------------------------------------------------------------- */

export function aiQuestionsPrompt(input: {
  topic: string
  subject: string
  position: string
  examBoard: string | null
  notes: string
  style: QuestionStyle
  count: number
}): string {
  const format =
    input.style === 'true_false'
      ? `Itens de CERTO ou ERRADO no estilo Cebraspe (afirmações que o candidato julga). Equilibre certos e errados. Formato:
[{"statement": "afirmação", "answer": "C" | "E", "explanation": "por que está certo/errado"}]`
      : `Questões de MÚLTIPLA ESCOLHA com 5 alternativas (A a E) e uma única correta, no estilo de FGV/FCC/Vunesp. Formato:
[{"statement": "enunciado", "options": ["A", "B", "C", "D", "E"], "answer": 0, "explanation": "comentário do gabarito"}]  (answer = índice 0–4)`
  return `Você elabora questões de concurso público no Brasil.

Cargo: ${input.position}
Disciplina: ${input.subject}
Assunto: ${input.topic}${input.examBoard ? `\nBanca de referência: ${input.examBoard}` : ''}

Material do estudante:
"""
${input.notes.slice(0, 14000)}
"""

Crie ${input.count} questões sobre o assunto, baseadas principalmente no material acima. Não invente números de leis, artigos, prazos ou súmulas que não estejam no material; se usar conhecimento geral, fique no que é pacífico. Explicações curtas e objetivas, citando o fundamento quando ele estiver no material.

Responda apenas com um array JSON. ${format}`
}

/** Valida a resposta do Claude. */
export function parseAiQuestions(value: unknown, style: QuestionStyle, newId: () => string): QuizQuestion[] {
  if (!Array.isArray(value)) return []
  const out: QuizQuestion[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const v = raw as Record<string, unknown>
    const statement = String(v.statement ?? '').trim()
    const explanation = String(v.explanation ?? '').trim()
    if (statement.length < 10) continue
    if (style === 'true_false') {
      const a = String(v.answer ?? '').trim().toUpperCase()
      const answer = a.startsWith('C') || a === 'TRUE' || a === 'CERTO' ? 0 : a.startsWith('E') || a === 'FALSE' || a === 'ERRADO' ? 1 : -1
      if (answer < 0) continue
      out.push({ id: newId(), style, statement, options: TRUE_FALSE_OPTIONS, answer, explanation, chosen: null })
    } else {
      const options = Array.isArray(v.options) ? v.options.map((o) => String(o).replace(/^\s*[A-Ea-e][).:-]\s*/, '').trim()).filter(Boolean) : []
      const answer = typeof v.answer === 'number' ? v.answer : 'ABCDE'.indexOf(String(v.answer ?? '').trim().toUpperCase().charAt(0))
      if (options.length < 4 || options.length > 5 || answer < 0 || answer >= options.length) continue
      out.push({ id: newId(), style, statement, options, answer, explanation, chosen: null })
    }
  }
  return out.slice(0, 20)
}

/* -------------------------------------------------------------------------- */
/* Correção e desempenho                                                      */
/* -------------------------------------------------------------------------- */

/** Registra a resposta de uma questão e atualiza o placar do assunto. */
export function answerQuestion(quiz: Quiz, questionId: string, chosen: number): Quiz {
  const q = quiz.questions.find((x) => x.id === questionId)
  if (!q || q.chosen !== null) return quiz
  return {
    ...quiz,
    questions: quiz.questions.map((x) => (x.id === questionId ? { ...x, chosen } : x)),
    answered: quiz.answered + 1,
    correct: quiz.correct + (chosen === q.answer ? 1 : 0),
  }
}

export interface Performance {
  answered: number
  correct: number
  /** 0–1 */
  accuracy: number
}

export function performanceOf(quizzes: Pick<Quiz, 'answered' | 'correct'>[]): Performance {
  const answered = quizzes.reduce((n, q) => n + q.answered, 0)
  const correct = quizzes.reduce((n, q) => n + q.correct, 0)
  return { answered, correct, accuracy: answered ? correct / answered : 0 }
}
