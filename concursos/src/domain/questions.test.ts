import { describe, expect, it } from 'vitest'
import { cleanAiHtml, notesAsText, quickSummary } from './assistant'
import { answerQuestion, falsify, generateTrueFalse, parseAiQuestions, performanceOf, type Quiz } from './questions'

let n = 0
const id = () => `q${++n}`
const content = {
  summary:
    '<h2>Mandado de segurança</h2><ul><li><p>Prazo: o mandado de segurança deve ser impetrado em 120 dias.</p></li><li><p>O habeas corpus é gratuito e dispensa advogado.</p></li></ul>',
  keyPoints: '<ul><li><p>A emenda é aprovada por três quintos dos votos, em dois turnos.</p></li><li><p>Não cabe habeas corpus em punição disciplinar militar.</p></li></ul>',
  pitfalls: '',
  notes: '<p>Revisar a súmula depois.</p>',
}

describe('falsify', () => {
  it('troca números, inverte o sentido ou nega', () => {
    expect(falsify('O prazo é de 120 dias')).toBe('O prazo é de 150 dias')
    expect(falsify('A emenda exige três quintos dos votos')).toBe('A emenda exige dois terços dos votos')
    expect(falsify('Não cabe habeas corpus em punição militar')).toBe('Cabe habeas corpus em punição militar')
    expect(falsify('O habeas corpus é gratuito')).toBe('O habeas corpus é oneroso')
    expect(falsify('A competência é do Senado')).toBe('A competência não é do Senado')
  })
})

describe('generateTrueFalse', () => {
  const qs = generateTrueFalse('t1', content, id)

  it('gera itens certos e errados a partir das anotações (observações ficam de fora)', () => {
    expect(qs.length).toBe(4)
    expect(qs.map((q) => q.answer)).toEqual([0, 1, 0, 1])
    expect(qs[1].statement).toBe('O habeas corpus é oneroso e dispensa advogado.')
    expect(qs[1].explanation).toContain('O habeas corpus é gratuito')
    expect(qs.some((q) => q.statement.includes('súmula'))).toBe(false)
  })

  it('placar acumula respostas e não conta a mesma questão duas vezes', () => {
    let quiz: Quiz = { topicId: 't1', source: 'auto', style: 'true_false', generatedAt: '', questions: qs, answered: 0, correct: 0 }
    quiz = answerQuestion(quiz, qs[0].id, 0)
    quiz = answerQuestion(quiz, qs[1].id, 0)
    quiz = answerQuestion(quiz, qs[1].id, 1)
    expect(quiz).toMatchObject({ answered: 2, correct: 1 })
    expect(performanceOf([quiz, { answered: 2, correct: 2 }])).toEqual({ answered: 4, correct: 3, accuracy: 0.75 })
  })
})

describe('parseAiQuestions', () => {
  it('Certo/Errado e múltipla escolha, descartando itens malformados', () => {
    expect(
      parseAiQuestions(
        [
          { statement: 'O MS coletivo pode ser impetrado por partido político.', answer: 'C', explanation: 'Art. 5º, LXX.' },
          { statement: 'curto', answer: 'C' },
          { statement: 'O habeas data é oneroso em todos os casos.', answer: 'Errado', explanation: 'É gratuito.' },
          { statement: 'Item sem gabarito válido algum aqui.', answer: '?' },
        ],
        'true_false',
        id,
      ).map((q) => [q.answer, q.statement.slice(0, 10)]),
    ).toEqual([
      [0, 'O MS colet'],
      [1, 'O habeas d'],
    ])
    const mc = parseAiQuestions(
      [
        { statement: 'Qual o prazo do mandado de segurança?', options: ['A) 30 dias', 'B) 60 dias', 'C) 90 dias', 'D) 120 dias', 'E) 180 dias'], answer: 3, explanation: 'Lei 12.016.' },
        { statement: 'Questão com poucas alternativas aqui', options: ['a', 'b'], answer: 0 },
        { statement: 'Gabarito em letra também é aceito?', options: ['1', '2', '3', '4', '5'], answer: 'B' },
      ],
      'multiple_choice',
      id,
    )
    expect(mc.map((q) => [q.options[0], q.answer])).toEqual([
      ['30 dias', 3],
      ['1', 1],
    ])
  })
})

describe('resumir e explicar', () => {
  it('resumo rápido lista os tópicos das anotações', () => {
    const html = quickSummary('Remédios', content)
    expect(html).toContain('<h3>Resumo rápido — Remédios</h3>')
    expect(html).toContain('<strong>Mandado de segurança</strong>')
    expect(html).not.toContain('súmula')
  })

  it('texto das anotações por campo e limpeza do HTML da IA', () => {
    expect(notesAsText(content)).toContain('Pontos importantes:\nA emenda')
    expect(cleanAiHtml('```html\n<h3>Oi</h3><script>x</script><p onclick="y">a</p>\n```')).toBe('<h3>Oi</h3><p>a</p>')
  })
})
