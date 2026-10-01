import { describe, expect, it } from 'vitest'
import { aggregateExams, classifyQuestions, countLabels, parseAiLabels, planCatalog, splitQuestions, subjectForHeading, type ExamAnalysis } from './exam-analysis'
import type { PlanSubject } from './types'

const subject = (id: string, name: string, topics: [string, string[]][]): PlanSubject => ({
  subject: { id, slug: id, name, icon: 'book' },
  weight: null,
  questionCount: null,
  frequency: 1,
  contestIds: ['c'],
  topics: topics.map(([n, details], i) => ({ topic: { id: `${id}__${i}`, subjectId: id, name: n, order: i }, frequency: 1, contestIds: ['c'], details })),
})

const plan = [
  subject('port', 'Língua Portuguesa', [
    ['Concordância verbal e nominal', ['concordância']],
    ['Crase', ['acento grave']],
    ['Pontuação', ['vírgula', 'ponto e vírgula']],
  ]),
  subject('const', 'Direito Constitucional', [
    ['Remédios constitucionais', ['habeas corpus', 'mandado de segurança', 'habeas data']],
    ['Poder Legislativo', ['Congresso Nacional', 'comissões parlamentares de inquérito']],
  ]),
]

describe('splitQuestions', () => {
  it('separa questões numeradas e guarda o título da seção; ignora cabeçalhos repetidos', () => {
    const header = 'FGV – CONCURSO X – PROVA TIPO 1'
    const pages = [
      `${header}\nLÍNGUA PORTUGUESA\n1\nAssinale a frase em que a concordância verbal está correta.\n(A) Fazem dois anos\n(B) Faz dois anos\n2`,
      `${header}\n2. O acento grave indicativo de crase está correto em:\n(A) à partir\n3 - A vírgula foi empregada corretamente em:\n(A) Ele, saiu`,
      `${header}\nDIREITO CONSTITUCIONAL\nQuestão 4\nSobre o habeas corpus, é correto afirmar:\n(A) é gratuito`,
      `${header}\n5) As comissões parlamentares de inquérito do Congresso Nacional:\n(A) podem quebrar sigilo bancário. 6 dias`,
    ]
    const qs = splitQuestions(pages)
    expect(qs.map((q) => [q.number, q.heading])).toEqual([
      [1, 'LÍNGUA PORTUGUESA'],
      [2, 'LÍNGUA PORTUGUESA'],
      [3, 'LÍNGUA PORTUGUESA'],
      [4, 'DIREITO CONSTITUCIONAL'],
      [5, 'DIREITO CONSTITUCIONAL'],
    ])
    expect(qs[0].text).toContain('concordância verbal')
    expect(qs.some((q) => q.text.includes('FGV – CONCURSO'))).toBe(false)

    const counts = countLabels(classifyQuestions(qs, plan))
    expect(counts.map((s) => [s.name, s.questions])).toEqual([
      ['Língua Portuguesa', 3],
      ['Direito Constitucional', 2],
    ])
    expect(counts[0].topics.map((t) => [t.name, t.count]).sort()).toEqual([
      ['Concordância verbal e nominal', 1],
      ['Crase', 1],
      ['Pontuação', 1],
    ])
    expect(counts[1].topics.map((t) => t.name).sort()).toEqual(['Poder Legislativo', 'Remédios constitucionais'])
  })

  it('prova sem títulos de disciplina (estilo Cebraspe): classifica pelo conteúdo', () => {
    const pages = [
      'CONHECIMENTOS BÁSICOS\nJulgue os itens a seguir.\n1 O habeas data pode ser impetrado para retificar dados pessoais.\n2 O mandado de segurança coletivo pode ser impetrado por partido político.',
      '3 No trecho, o emprego do acento grave indicativo de crase é obrigatório.\n4 Item sobre assunto que não está no plano de estudos algum.',
    ]
    const labels = classifyQuestions(splitQuestions(pages), plan)
    expect(labels.map((l) => [l.subjectName, l.topicName])).toEqual([
      ['Direito Constitucional', 'Remédios constitucionais'],
      ['Direito Constitucional', 'Remédios constitucionais'],
      ['Língua Portuguesa', 'Crase'],
      ['Não identificada', null],
    ])
  })
})

describe('disciplinas e consolidação', () => {
  it('casa títulos da prova com as disciplinas do plano', () => {
    expect(subjectForHeading('PORTUGUÊS', plan)?.subject.id).toBe('port')
    expect(subjectForHeading('MATEMÁTICA', plan)).toBeNull()
    expect(subjectForHeading('LÍNGUA PORTUGUESA', plan)?.subject.id).toBe('port')
    expect(subjectForHeading('NOÇÕES DE DIREITO CONSTITUCIONAL', plan)?.subject.id).toBe('const')
  })

  it('classificação do Claude por códigos do catálogo', () => {
    expect(planCatalog(plan).text).toContain('D2.1 Remédios constitucionais')
    const qs = [1, 2, 3].map((n) => ({ number: n, text: 'x', heading: null }))
    const labels = parseAiLabels(
      [
        { n: 1, code: 'D2.1' },
        { n: 2, code: 'D1' },
        { n: 3, code: null, other: 'Raciocínio Lógico' },
      ],
      qs,
      plan,
    )
    expect(labels.map((l) => [l.subjectName, l.topicName])).toEqual([
      ['Direito Constitucional', 'Remédios constitucionais'],
      ['Língua Portuguesa', null],
      ['Raciocínio Lógico', null],
    ])
  })

  it('soma várias provas: questões por disciplina, % do total e assuntos mais cobrados', () => {
    const exam = (id: string, subjects: ExamAnalysis['subjects']): ExamAnalysis => ({
      id, positionId: 'p', name: id, year: null, examBoard: null, method: 'auto', createdAt: '', totalQuestions: subjects.reduce((n, s) => n + s.questions, 0), subjects,
    })
    const agg = aggregateExams([
      exam('a', [
        { subjectId: 'port', name: 'Língua Portuguesa', questions: 6, topics: [{ topicId: 'port__1', name: 'Crase', count: 4 }, { topicId: null, name: 'Outros assuntos', count: 2 }] },
        { subjectId: 'const', name: 'Direito Constitucional', questions: 4, topics: [{ topicId: 'const__0', name: 'Remédios constitucionais', count: 4 }] },
      ]),
      exam('b', [{ subjectId: 'const', name: 'Direito Constitucional', questions: 10, topics: [{ topicId: 'const__0', name: 'Remédios constitucionais', count: 7 }, { topicId: 'const__1', name: 'Poder Legislativo', count: 3 }] }]),
    ])
    expect(agg.total).toBe(20)
    expect(agg.subjects.map((s) => [s.name, s.questions, s.share])).toEqual([
      ['Direito Constitucional', 14, 0.7],
      ['Língua Portuguesa', 6, 0.3],
    ])
    expect(agg.subjects[0].topics.map((t) => [t.name, t.count])).toEqual([
      ['Remédios constitucionais', 11],
      ['Poder Legislativo', 3],
    ])
    expect(agg.subjects[1].topics.at(-1)?.name).toBe('Outros assuntos')
  })
})

describe('vocabulário dos assuntos', () => {
  it('reconhece o assunto por termos típicos, mesmo sem o nome do assunto na questão', () => {
    const plain = [
      subject('const', 'Direito Constitucional', [
        ['Remédios constitucionais', []],
        ['Poder Legislativo', []],
      ]),
      subject('info', 'Informática', [['Segurança da informação', []], ['Redes de computadores', []]]),
    ]
    const qs = [
      { number: 1, heading: null, text: 'Caberá habeas corpus sempre que alguém sofrer violência em sua liberdade de locomoção.' },
      { number: 2, heading: null, text: 'A CPI tem poderes de investigação próprios das autoridades judiciais, e o Senado Federal...' },
      { number: 3, heading: null, text: 'O ransomware criptografa os arquivos e exige resgate; o firewall não impede.' },
      { number: 4, heading: null, text: 'O protocolo DNS traduz nomes de domínio em endereços IP.' },
    ]
    expect(classifyQuestions(qs, plain).map((l) => l.topicName)).toEqual(['Remédios constitucionais', 'Poder Legislativo', 'Segurança da informação', 'Redes de computadores'])
  })
})
