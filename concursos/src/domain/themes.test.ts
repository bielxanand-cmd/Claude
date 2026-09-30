import { describe, expect, it } from 'vitest'
import { rootThemes, sortThemes, subthemesOf, themePreview, withThemes, type Theme } from './themes'

const theme = (p: Partial<Theme>): Theme => ({ id: 'x', topicId: 't', title: 'Tema', summary: '', keyPoints: '', order: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01', ...p })

describe('temas', () => {
  const themes = [
    theme({ id: 'b', title: 'Reformador', order: 1, summary: '<ul><li><p>Emenda: 3/5 em 2 turnos</p></li></ul>', keyPoints: '<p>Cláusulas pétreas</p>' }),
    theme({ id: 'a', title: 'Originário', order: 0, summary: '<p>Inicial & ilimitado</p>' }),
    theme({ id: 'c', title: 'Vazio', order: 2 }),
  ]

  it('ordena e gera a prévia', () => {
    expect(sortThemes(themes).map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(themePreview(themes[1])).toBe('Inicial & ilimitado')
  })

  it('junta os temas ao resumo geral, cada um como título', () => {
    const content = withThemes({ summary: '<p>Geral</p>', keyPoints: '', pitfalls: '', notes: '' }, themes)
    expect(content.summary).toBe('<p>Geral</p><h2>Originário</h2><p>Inicial & ilimitado</p><h2>Reformador</h2><ul><li><p>Emenda: 3/5 em 2 turnos</p></li></ul>')
    expect(content.keyPoints).toBe('<h2>Reformador</h2><p>Cláusulas pétreas</p>')
  })
})

describe('subtemas', () => {
  const themes = [
    theme({ id: 'p', title: 'Poder derivado', summary: '<p>Secundário</p>' }),
    theme({ id: 's2', parentId: 'p', title: 'Revisor', order: 1, keyPoints: '<p>Só uma vez, em 1993</p>' }),
    theme({ id: 's1', parentId: 'p', title: 'Reformador', order: 0, summary: '<p>Emendas</p>' }),
  ]

  it('separa temas e subtemas e junta tudo ao resumo', () => {
    expect(rootThemes(themes).map((t) => t.id)).toEqual(['p'])
    expect(subthemesOf(themes, 'p').map((t) => t.id)).toEqual(['s1', 's2'])
    const content = withThemes({ summary: '', keyPoints: '', pitfalls: '', notes: '' }, themes)
    expect(content.summary).toBe('<h2>Poder derivado</h2><p>Secundário</p><h3>Reformador</h3><p>Emendas</p>')
    expect(content.keyPoints).toBe('<h2>Poder derivado</h2><h3>Revisor</h3><p>Só uma vez, em 1993</p>')
  })
})
