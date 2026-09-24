import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectNoticeMetadata, findSyllabusSection, parseNoticeSyllabus, parseSyllabus, toImportSubjects } from './notice-parser'

/** Trechos reais do Edital nº 1 – PRF, de 18/1/2021 (Cebraspe): cabeçalho + seção 24 + início do Anexo I. */
const PRF = readFileSync(resolve(import.meta.dirname, '__fixtures__/edital-prf-2021.txt'), 'utf8')

describe('edital real — PRF 2021 (Cebraspe)', () => {
  const section = findSyllabusSection(PRF)
  const subjects = parseSyllabus(section.text)
  const byName = (name: string) => subjects.find((s) => s.name === name)!

  it('localiza a seção de objetos de avaliação e para no anexo', () => {
    expect(section.heading).toBe('24 DOS OBJETOS DE AVALIAÇÃO (HABILIDADES E CONHECIMENTOS)')
    expect(section.text).not.toMatch(/CRONOGRAMA|horário oficial/i)
  })

  it('identifica todas as disciplinas, com o bloco de cada uma', () => {
    expect(subjects.map((s) => s.name)).toEqual([
      'Língua Portuguesa',
      'Raciocínio Lógico-Matemático',
      'Informática',
      'Física',
      'Ética e Cidadania',
      'Geopolítica',
      'Língua Inglesa',
      'Língua Espanhola',
      'Legislação de Trânsito',
      'Direito Administrativo',
      'Direito Constitucional',
      'Direito Penal',
      'Direito Processual Penal',
      'Legislação Especial',
      'Direitos Humanos',
    ])
    expect(byName('Física').group).toBe('Bloco I')
    expect(byName('Legislação de Trânsito').group).toBe('Bloco II')
    expect(byName('Direitos Humanos').group).toBe('Bloco III')
  })

  it('separa assuntos no formato "1 Item. 2 Item." mesmo com quebras de página e de linha', () => {
    const lp = byName('Língua Portuguesa')
    expect(lp.topics).toHaveLength(7)
    expect(lp.topics[0].name).toBe('Compreensão e interpretação de textos de gêneros variados')
    // item 6 continua na página seguinte do PDF (número de página "38" no meio)
    expect(lp.topics[5]).toEqual({
      name: 'Reescrita de frases e parágrafos do texto',
      details: [
        'Significação das palavras',
        'Substituição de palavras ou de trechos de texto',
        'Reorganização da estrutura de orações e de períodos do texto',
        'Reescrita de textos de diferentes gêneros e níveis de formalidade',
      ],
    })
    expect(byName('Geopolítica').topics.map((t) => t.name)).toContain('A divisão inter-regional do trabalho e da produção no Brasil')
    // "7 Rede de transporte … infraestruturas 8 A integração" — item sem ponto final
    expect(byName('Geopolítica').topics).toHaveLength(10)
  })

  it('agrupa subitens (4.1, 4.4.1…) no item principal e não confunde números de leis', () => {
    const lp = byName('Língua Portuguesa')
    expect(lp.topics[4].details).toContain('Emprego do sinal indicativo de crase')
    const leg = byName('Legislação Especial')
    expect(leg.topics).toHaveLength(12)
    expect(leg.topics[0].name).toBe('Lei nº 5.553/1968 e Lei nº 12.037/2009')
    expect(byName('Ética e Cidadania').topics[3].details).toHaveLength(7)
  })

  it('opção "subitens como assuntos"', () => {
    const [lp] = toImportSubjects([byName('Língua Portuguesa')], 'subtopics')
    expect(lp.topics.map((t) => t.name)).toContain('Concordância verbal e nominal')
    const [adm] = toImportSubjects([byName('Direito Administrativo')], 'subtopics')
    // subitem curto ganha o contexto do item principal
    expect(adm.topics.map((t) => t.name)).toContain('Regime jurídico-administrativo: conceito')
  })

  it('detecta órgão, sigla, ano, banca e esfera', () => {
    expect(detectNoticeMetadata(PRF)).toEqual({
      organization: 'Polícia Rodoviária Federal',
      organizationShort: 'PRF',
      year: 2021,
      examBoard: 'Cebraspe',
      sphere: 'federal',
    })
  })
})

describe('outros formatos de banca', () => {
  it('detecta a sigla no formato "EDITAL Nº 1 – TCU, DE …"', () => {
    const meta = detectNoticeMetadata('TRIBUNAL DE CONTAS DA UNIÃO\nEDITAL Nº 1 – TCU, DE 10 DE MARÇO DE 2025\nA prova será aplicada pela FGV.')
    expect(meta).toMatchObject({ organization: 'Tribunal de Contas da União', organizationShort: 'TCU', year: 2025, examBoard: 'FGV' })
  })

  it('título em caixa alta com peso/questões e itens "1." na mesma linha', () => {
    expect(parseNoticeSyllabus('LÍNGUA PORTUGUESA (peso 2, 20 questões): 1. Interpretação de textos. 2. Crase. 3. Regência verbal e nominal.')).toEqual([
      {
        name: 'Língua Portuguesa',
        weight: 2,
        questionCount: 20,
        topics: [
          { name: 'Interpretação de textos', details: [] },
          { name: 'Crase', details: [] },
          { name: 'Regência verbal e nominal', details: [] },
        ],
      },
    ])
  })

  it('título sozinho na linha e itens numerados abaixo (estilo FCC/Vunesp)', () => {
    const result = parseNoticeSyllabus(`CONHECIMENTOS BÁSICOS
LÍNGUA PORTUGUESA
1. Leitura e interpretação de diversos tipos de textos.
2) Sinônimos e antônimos.
NOÇÕES DE INFORMÁTICA
1 – Windows 10.
2 – Microsoft Word.`)
    expect(result.map((s) => [s.name, s.topics.map((t) => t.name)])).toEqual([
      ['Língua Portuguesa', ['Leitura e interpretação de diversos tipos de textos', 'Sinônimos e antônimos']],
      ['Noções de Informática', ['Windows 10', 'Microsoft Word']],
    ])
  })

  it('listas com marcadores e títulos em caixa normal', () => {
    const result = parseNoticeSyllabus(`Direito Tributário:
- Competência tributária
- Crédito tributário: constituição e lançamento
• Extinção do crédito tributário`)
    expect(result[0].name).toBe('Direito Tributário')
    expect(result[0].topics.map((t) => t.name)).toEqual([
      'Competência tributária',
      'Crédito tributário: constituição e lançamento',
      'Extinção do crédito tributário',
    ])
  })

  it('itens separados por ponto e vírgula', () => {
    const [subject] = parseNoticeSyllabus('Raciocínio Lógico:\nProposições; Tabelas-verdade; Equivalências')
    expect(subject.topics.map((t) => t.name)).toEqual(['Proposições', 'Tabelas-verdade', 'Equivalências'])
  })

  it('não quebra números de leis e guarda subitens como detalhes', () => {
    const [subject] = parseNoticeSyllabus('DIREITO ADMINISTRATIVO: 1. Licitações (Lei nº 14.133/2021). 2. Agentes públicos. 2.1 Lei 8.112/1990.')
    expect(subject.topics).toEqual([
      { name: 'Licitações (Lei nº 14.133/2021)', details: [] },
      { name: 'Agentes públicos', details: ['Lei 8.112/1990'] },
    ])
  })

  it('ignora texto corrido do edital fora das disciplinas', () => {
    const result = parseNoticeSyllabus(`3.1 As provas serão realizadas nas capitais dos estados, em datas a serem divulgadas oportunamente no endereço eletrônico, e o candidato deverá comparecer com antecedência mínima de uma hora.
DIREITO PENAL: 1 Teoria do crime. 2 Penas.`)
    expect(result.map((s) => s.name)).toEqual(['Direito Penal'])
  })
})
