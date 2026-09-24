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
  it('cria um ramo por campo preenchido e limita a quantidade de itens', () => {
    const map = buildMindMap({
      title: 'Remédios constitucionais',
      subtitle: 'Direito Constitucional',
      sections: [
        { key: 'summary', label: 'Meu resumo', color: '#7C3AED', html: `<ul>${Array.from({ length: 12 }, (_, i) => `<li><p>Item ${i + 1}</p></li>`).join('')}</ul>` },
        { key: 'keyPoints', label: 'Pontos importantes', color: '#D97706', html: '' },
        { key: 'pitfalls', label: 'Pegadinhas', color: '#DC2626', html: '<p>Não cabe HC em punição disciplinar militar.</p>' },
      ],
    })
    expect(map.branches.map((b) => b.label)).toEqual(['Meu resumo', 'Pegadinhas'])
    expect(map.branches[0].children).toHaveLength(9)
    expect(map.branches[0].children.at(-1)!.label).toBe('+4 itens')
  })
})
