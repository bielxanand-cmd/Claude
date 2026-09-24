import { describe, expect, it } from 'vitest'
import { cleanPageText, extractiveSummary, findRelevantPages, mergeSummary, parseAiSummary, toBookPages } from './book'
import { generateFlashcards } from './flashcards'
import { sanitizeSummaryHtml } from './sanitize-html'

/** Livro fictício de Direito Constitucional (texto escrito para o teste). */
const BOOK = toBookPages([
  'Sumário\nCapítulo 1 Teoria da Constituição .... 2\nCapítulo 2 Poder constituinte .... 3',
  'CAPÍTULO 1 — TEORIA DA CONSTITUIÇÃO\nA Constituição é a lei fundamental do Estado e organiza os seus elementos essenciais.',
  'CAPÍTULO 2 — PODER CONSTITUINTE\nO poder constituinte é o poder de criar ou modificar a Constituição. O poder constituinte originário é inicial, ilimi-\ntado e incondicionado. O titular do poder constituinte é o povo, segundo a doutrina majoritária.\n4',
  'O poder constituinte derivado reformador altera a Constituição por meio de emendas, observado o art. 60 da Constituição. A proposta de emenda é discutida e votada em cada Casa do Congresso Nacional, em dois turnos, considerando-se aprovada se obtiver três quintos dos votos. Não pode ser objeto de deliberação a proposta de emenda tendente a abolir as cláusulas pétreas, salvo nas hipóteses que não atinjam o seu núcleo essencial.',
  'O poder constituinte derivado decorrente é o poder dos Estados-membros de elaborar suas próprias Constituições. A matéria constante de proposta de emenda rejeitada não pode ser objeto de nova proposta na mesma sessão legislativa.',
  'CAPÍTULO 3 — DIREITOS FUNDAMENTAIS\nOs direitos fundamentais têm aplicação imediata. O habeas corpus protege a liberdade de locomoção.',
])

describe('texto do PDF', () => {
  it('junta linhas, desfaz hifenização e remove números de página', () => {
    expect(cleanPageText('é inicial, ilimi-\ntado e incondicionado.\n4')).toBe('é inicial, ilimitado e incondicionado.')
  })
})

describe('findRelevantPages', () => {
  it('encontra as páginas do assunto e vizinhas que continuam o tema', () => {
    const e = findRelevantPages(BOOK, 'Poder constituinte', ['Poder constituinte originário e derivado', 'Emendas à Constituição'])
    expect(e).toMatchObject({ firstPage: 3, lastPage: 5 })
  })

  it('retorna null quando o livro não trata do assunto', () => {
    expect(findRelevantPages(BOOK, 'Licitações e contratos administrativos')).toBeNull()
  })
})

describe('extractiveSummary', () => {
  const excerpt = findRelevantPages(BOOK, 'Poder constituinte', ['Emendas à Constituição'])!
  const content = extractiveSummary({ topicName: 'Poder constituinte', bookName: 'Direito Constitucional Esquematizado', excerpt })

  it('monta os campos com trechos do livro e cita a fonte', () => {
    expect(content.summary).toContain('<h2>Poder constituinte</h2>')
    expect(content.summary).toContain('ilimitado e incondicionado')
    expect(content.pitfalls).toContain('salvo nas hipóteses')
    expect(content.notes).toContain('Direito Constitucional Esquematizado')
    expect(content.notes).toContain('pp. 3–5')
  })

  it('destaca artigos e prazos, que viram lacunas nos flashcards', () => {
    const all = Object.values(content).join('')
    expect(all).toContain('<strong>art. 60</strong>')
    const cards = generateFlashcards('Poder constituinte', content)
    expect(cards.some((c) => c.kind === 'cloze' && c.back === 'art. 60')).toBe(true)
  })
})

describe('trechos em ordem', () => {
  it('inclui frases que continuam o assunto e para no próximo capítulo', () => {
    const pages = toBookPages([
      'CAPÍTULO 7 — REMÉDIOS CONSTITUCIONAIS\nOs remédios constitucionais protegem direitos fundamentais contra abusos. O habeas corpus protege a liberdade de locomoção de qualquer pessoa. O habeas data assegura o conhecimento de informações pessoais.\nCAPÍTULO 8 — PODER LEGISLATIVO\nO Poder Legislativo federal é exercido pelo Congresso Nacional, composto por duas Casas.',
    ])
    const excerpt = findRelevantPages(pages, 'Remédios constitucionais')!
    const content = extractiveSummary({ topicName: 'Remédios constitucionais', bookName: 'Livro', excerpt })
    expect(content.summary).toContain('O habeas corpus protege a liberdade')
    expect(content.summary).not.toContain('CAPÍTULO 7')
    expect(content.summary).not.toContain('Congresso Nacional')
  })
})

describe('resposta da IA', () => {
  it('higieniza o HTML e ignora respostas inválidas', () => {
    const parsed = parseAiSummary({
      summary: '<h1 onclick="x()">Título</h1><p>Texto <b>forte</b><script>alert(1)</script></p><img src=x onerror=alert(1)>',
      keyPoints: '<ul><li>Um</li></ul>',
      pitfalls: 42,
      notes: 'Fonte: livro, p. 3',
    })
    expect(parsed).toEqual({
      summary: '<h2>Título</h2><p>Texto <strong>forte</strong></p>',
      keyPoints: '<ul><li>Um</li></ul>',
      pitfalls: '',
      notes: '<p>Fonte: livro, p. 3</p>',
    })
    expect(parseAiSummary('texto')).toBeNull()
    expect(parseAiSummary({})).toBeNull()
  })

  it('sanitizeSummaryHtml escapa texto e remove atributos', () => {
    expect(sanitizeSummaryHtml('<p class="x">a &lt; b</p><a href="javascript:x">link</a>')).toBe('<p>a &lt; b</p>link')
  })
})

describe('mergeSummary', () => {
  it('adiciona ao final ou substitui', () => {
    const cur = { summary: '<p>meu</p>', keyPoints: '', pitfalls: '', notes: '' }
    const inc = { summary: '<p>livro</p>', keyPoints: '<ul><li>k</li></ul>', pitfalls: '', notes: '' }
    expect(mergeSummary(cur, inc, 'append')).toEqual({ summary: '<p>meu</p><p>livro</p>', keyPoints: '<ul><li>k</li></ul>', pitfalls: '', notes: '' })
    expect(mergeSummary(cur, inc, 'replace').summary).toBe('<p>livro</p>')
  })
})
