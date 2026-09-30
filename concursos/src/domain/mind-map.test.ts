import { describe, expect, it } from 'vitest'
import { buildMindMap, htmlToNodes } from './mind-map'

const labels = (nodes: { label: string; children: unknown[] }[]) => nodes.map((n) => n.label)

describe('htmlToNodes', () => {
  it('transforma listas em nós e "Rótulo: explicação" em nó com filho', () => {
    const nodes = htmlToNodes(
      '<ul><li><p><strong>Habeas corpus</strong>: protege a liberdade de locomoção.</p></li><li><p>Mandado de segurança – direito líquido e certo</p></li><li><p>Habeas data</p></li></ul>',
    )
    expect(nodes).toEqual([
      { label: 'Habeas corpus', children: [{ label: 'Protege a liberdade de locomoção', children: [] }] },
      { label: 'Mandado de segurança', children: [{ label: 'Direito líquido e certo', children: [] }] },
      { label: 'Habeas data', children: [] },
    ])
  })

  it('usa títulos como sub-ramos e divide parágrafos em frases', () => {
    const nodes = htmlToNodes(
      '<h2>Gratuitos</h2><p>HC e HD são gratuitos. A ação popular também, salvo má-fé.</p><h2>Legitimidade</h2><ol><li><p>MS coletivo: partido político</p><ul><li><p>com representação no Congresso</p></li></ul></li></ol>',
    )
    expect(labels(nodes)).toEqual(['Gratuitos', 'Legitimidade'])
    expect(labels(nodes[0].children)).toEqual(['HC e HD são gratuitos', 'A ação popular também, salvo má-fé'])
    const ms = nodes[1].children[0]
    expect(ms.label).toBe('MS coletivo')
    expect(labels(ms.children)).toEqual(['Partido político', 'com representação no Congresso'])
  })

  it('entende checklist, citações, destaques e entidades HTML', () => {
    const nodes = htmlToNodes(
      '<ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Ler art. 5º</p></div></li></ul><blockquote><p>Cabe &quot;HC&quot; contra ato de particular.</p></blockquote><p><mark>Prazo</mark> de 120 dias &amp; decadencial</p>',
    )
    expect(labels(nodes)).toEqual(['Ler art. 5º', 'Cabe "HC" contra ato de particular', 'Prazo de 120 dias & decadencial'])
  })

  it('encurta textos longos', () => {
    const [node] = htmlToNodes(`<p>${'palavra '.repeat(30)}</p>`)
    expect(node.label.length).toBeLessThanOrEqual(73)
    expect(node.label.endsWith('…')).toBe(true)
  })
})

describe('buildMindMap', () => {
  it('monta um cartão por conceito, com a definição no centro', () => {
    const map = buildMindMap({
      title: 'Remédios constitucionais',
      subtitle: 'Direito Constitucional',
      sections: [
        {
          key: 'summary',
          label: 'Meu resumo',
          html:
            '<p>Remédios constitucionais são garantias que protegem direitos fundamentais.</p>' +
            '<ul><li><p>Mandado de segurança: direito líquido e certo</p></li></ul>' +
            '<h2>Habeas corpus</h2><ul><li><p>O que é: protege a liberdade de locomoção</p></li><li><p>Gratuito e sem advogado</p></li></ul>',
        },
        { key: 'keyPoints', label: 'Pontos importantes', html: `<ul>${Array.from({ length: 9 }, (_, i) => `<li><p>Item ${i + 1}</p></li>`).join('')}</ul>` },
        { key: 'notes', label: 'Observações', html: '' },
      ],
    })
    expect(map.description).toBe('Remédios constitucionais são garantias que protegem direitos fundamentais')
    expect(map.cards.map((c) => [c.title, c.kind])).toEqual([
      ['Habeas corpus', 'concept'],
      ['Meu resumo', 'concept'],
      ['Pontos importantes', 'checklist'],
    ])
    expect(map.cards[0].items).toEqual([{ heading: 'O que é', lines: ['Protege a liberdade de locomoção'] }, { lines: ['Gratuito e sem advogado'] }])
    expect(map.cards[1].items).toEqual([{ heading: 'Mandado de segurança', lines: ['Direito líquido e certo'] }])
    expect(map.cards[2].items).toHaveLength(7)
    expect(map.cards[2].items.at(-1)!.lines).toEqual(['+3 itens no resumo'])
  })
})
