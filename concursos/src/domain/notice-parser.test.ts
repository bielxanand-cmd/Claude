import { describe, expect, it } from 'vitest'
import { parseNoticeSyllabus } from './notice-parser'

describe('parseNoticeSyllabus', () => {
  it('lê disciplinas em caixa alta com itens numerados na mesma linha', () => {
    const result = parseNoticeSyllabus(
      'LÍNGUA PORTUGUESA (peso 2, 20 questões): 1. Interpretação de textos. 2. Crase. 3. Regência verbal e nominal.',
    )
    expect(result).toEqual([
      {
        name: 'Língua Portuguesa',
        weight: 2,
        questionCount: 20,
        topics: ['Interpretação de textos', 'Crase', 'Regência verbal e nominal'],
      },
    ])
  })

  it('lê disciplinas com listas em linhas', () => {
    const result = parseNoticeSyllabus(`Direito Tributário:
- Competência tributária
- Crédito tributário: constituição e lançamento
• Extinção do crédito tributário

CONTABILIDADE GERAL:
1. Balanço patrimonial
2) DRE`)
    expect(result.map((s) => s.name)).toEqual(['Direito Tributário', 'Contabilidade Geral'])
    expect(result[0].topics).toEqual([
      'Competência tributária',
      'Crédito tributário: constituição e lançamento',
      'Extinção do crédito tributário',
    ])
    expect(result[1].topics).toEqual(['Balanço patrimonial', 'DRE'])
  })

  it('não quebra números de leis nem subitens', () => {
    const [subject] = parseNoticeSyllabus(
      'DIREITO ADMINISTRATIVO: 1. Licitações (Lei nº 14.133/2021). 2. Agentes públicos: 2.1 Lei 8.112/1990.',
    )
    expect(subject.topics).toEqual(['Licitações (Lei nº 14.133/2021)', 'Agentes públicos: 2.1 Lei 8.112/1990'])
  })

  it('separa itens por ponto e vírgula', () => {
    const [subject] = parseNoticeSyllabus('Raciocínio Lógico:\nProposições; Tabelas-verdade; Equivalências')
    expect(subject.topics).toEqual(['Proposições', 'Tabelas-verdade', 'Equivalências'])
  })
})
