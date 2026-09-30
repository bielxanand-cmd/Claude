import { htmlToText } from '@/lib/text'
import { escapeHtml, sanitizeSummaryHtml } from './sanitize-html'
import { htmlToNodes, type MindMapNode } from './mind-map'
import { rootThemes, subthemesOf, themeHasContent, treeHasContent, type Theme } from './themes'
import type { SummaryContent } from './types'

/**
 * Assistentes "Resumir conteúdo" e "Explicar assunto": versões sem IA e
 * instruções para o Claude.
 */

/** Texto plano das anotações, por campo (para enviar ao Claude). */
export function notesAsText(content: SummaryContent): string {
  const parts: [string, string][] = [
    ['Meu resumo', content.summary],
    ['Pontos importantes', content.keyPoints],
    ['Pegadinhas', content.pitfalls],
    ['Observações', content.notes],
  ]
  return parts
    .map(([label, html]) => [label, htmlToText(html ?? '')] as const)
    .filter(([, text]) => text)
    .map(([label, text]) => `${label}:\n${text}`)
    .join('\n\n')
}

export const hasNotes = (content: SummaryContent) => notesAsText(content).length > 0

/**
 * Resumo rápido sem IA: os tópicos das anotações em uma lista enxuta
 * (títulos, "Tema: explicação" e itens de lista, sem repetir detalhes).
 */
export function quickSummary(topicName: string, content: SummaryContent, maxItems = 10): string {
  const items: string[] = []
  for (const html of [content.summary, content.keyPoints, content.pitfalls]) {
    for (const node of htmlToNodes(html ?? '')) {
      if (items.length >= maxItems) break
      const first = node.children[0]?.label
      const children = node.children.length > 1 ? node.children.slice(0, 3).map((c) => c.label).join('; ') : first
      items.push(children ? `<li><p><strong>${escapeHtml(node.label)}</strong>: ${escapeHtml(children)}</p></li>` : `<li><p>${escapeHtml(node.label)}</p></li>`)
    }
  }
  return items.length ? `<h3>Resumo rápido — ${escapeHtml(topicName)}</h3><ul>${items.join('')}</ul>` : ''
}

export function aiSummarizePrompt(input: { topic: string; subject: string; position: string; notes: string }): string {
  return `Você ajuda um estudante de concurso público no Brasil a revisar.

Cargo: ${input.position}
Disciplina: ${input.subject}
Assunto: ${input.topic}

Anotações do estudante:
"""
${input.notes.slice(0, 14000)}
"""

Escreva um RESUMO DE REVISÃO enxuto deste material: o essencial para a prova, em tópicos curtos, com os termos-chave, prazos e números em <strong>. Use SOMENTE o conteúdo das anotações; não acrescente fatos novos.

Responda apenas com HTML usando <h3>, <p>, <ul>, <li> e <strong> (sem markdown, sem blocos de código).`
}

export function aiExplainPrompt(input: { topic: string; subject: string; position: string; notes: string; details: string[]; bookExcerpt?: string }): string {
  return `Você é um professor de cursinho para concursos públicos no Brasil, didático e preciso.

Cargo: ${input.position}
Disciplina: ${input.subject}
Assunto: ${input.topic}
${input.details.length ? `O edital detalha: ${input.details.join('; ')}\n` : ''}${input.notes ? `\nAnotações do estudante (use como base e corrija gentilmente se algo estiver errado):\n"""\n${input.notes.slice(0, 10000)}\n"""\n` : ''}${input.bookExcerpt ? `\nTrecho do livro do estudante:\n"""\n${input.bookExcerpt.slice(0, 20000)}\n"""\n` : ''}
Explique o assunto de forma didática para quem vai fazer a prova: o conceito em linguagem simples, como funciona, um ou dois exemplos práticos, e como costuma ser cobrado (incluindo confusões comuns). Seja preciso: cite leis, artigos ou súmulas só quando tiver certeza; se algo depender de entendimento divergente, diga isso. Até ~500 palavras.

Responda apenas com HTML usando <h3>, <p>, <ul>, <li>, <strong> e <blockquote> (sem markdown, sem blocos de código).`
}

/** Limpa a resposta do Claude (pode vir com cerca de código ou texto solto). */
export function cleanAiHtml(text: string): string {
  const unfenced = text.replace(/^\s*```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '')
  return sanitizeSummaryHtml(unfenced)
}

/* -------------------------------------------------------------------------- */
/* Resumo geral a partir dos temas e subtemas                                 */
/* -------------------------------------------------------------------------- */

/** Temas (com subtemas) que têm algum texto, na ordem da página. */
export function filledThemes(themes: Theme[]): { theme: Theme; subthemes: Theme[] }[] {
  return rootThemes(themes)
    .filter((t) => t.title.trim() && treeHasContent(t, themes))
    .map((theme) => ({ theme, subthemes: subthemesOf(themes, theme.id).filter((s) => s.title.trim() && themeHasContent(s)) }))
}

/** Texto dos temas e subtemas, numerados, para enviar ao Claude. */
export function themesAsText(themes: Theme[]): string {
  const part = (t: Theme, indent: string) =>
    [
      htmlToText(t.summary) && `${indent}Resumo:\n${indent}${htmlToText(t.summary).replace(/\n/g, `\n${indent}`)}`,
      htmlToText(t.keyPoints) && `${indent}Pontos importantes:\n${indent}${htmlToText(t.keyPoints).replace(/\n/g, `\n${indent}`)}`,
    ]
      .filter(Boolean)
      .join('\n')
  return filledThemes(themes)
    .map(({ theme, subthemes }, i) =>
      [
        `TEMA ${i + 1}: ${theme.title.trim()}`,
        part(theme, ''),
        ...subthemes.map((s, j) => `  SUBTEMA ${i + 1}.${j + 1}: ${s.title.trim()}\n${part(s, '  ')}`),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}

/** Frases essenciais de um texto: "Rótulo: explicação" ou o próprio item. */
function essentials(html: string, max: number): string[] {
  const out: string[] = []
  const label = (n: MindMapNode) => (n.children.length ? `${n.label}: ${n.children.slice(0, 2).map((c) => c.label).join('; ')}` : n.label)
  const visit = (nodes: MindMapNode[]) => {
    for (const n of nodes) {
      if (out.length >= max) return
      // Títulos dentro do texto: entra o conteúdo deles
      if (n.children.length > 2 || n.children.some((c) => c.children.length)) visit(n.children)
      else out.push(label(n))
    }
  }
  visit(htmlToNodes(html, 180))
  return out
}

/**
 * Resumo geral sem IA: um bloco por tema, com as frases essenciais do tema e
 * de cada subtema (o nome do subtema em negrito).
 */
export function themesQuickSummary(themes: Theme[]): string {
  return filledThemes(themes)
    .map(({ theme, subthemes }) => {
      const items = [
        ...essentials(theme.summary, 3).map((t) => `<li><p>${escapeHtml(t)}</p></li>`),
        ...essentials(theme.keyPoints, 2).map((t) => `<li><p><strong>Atenção:</strong> ${escapeHtml(t)}</p></li>`),
        ...subthemes.map((s) => {
          const text = [...essentials(s.summary, 2), ...essentials(s.keyPoints, 1)].join('; ')
          return `<li><p><strong>${escapeHtml(s.title.trim())}</strong>${text ? `: ${escapeHtml(text)}` : ''}</p></li>`
        }),
      ]
      return `<h3>${escapeHtml(theme.title.trim())}</h3><ul>${items.join('')}</ul>`
    })
    .join('')
}

export function aiThemesSummaryPrompt(input: { topic: string; subject: string; position: string; themes: string }): string {
  return `Você ajuda um estudante de concurso público no Brasil a revisar.

Cargo: ${input.position}
Disciplina: ${input.subject}
Assunto: ${input.topic}

O estudante dividiu o assunto em temas e subtemas e escreveu um resumo e pontos importantes para cada um:
"""
${input.themes.slice(0, 16000)}
"""

Escreva o RESUMO GERAL do assunto a partir desse material, organizado pelos temas, na mesma ordem:
- para cada tema, um <h3> com o nome do tema e, abaixo, uma lista curta (<ul>) com o essencial para a prova;
- cada subtema vira um item da lista do seu tema, começando pelo nome do subtema em <strong>, seguido do essencial dele em uma ou duas frases;
- destaque em <strong> os termos-chave, prazos, quóruns e números;
- inclua os pontos importantes mais cobrados, sem repetir o que já disse.

Use SOMENTE o conteúdo do material; não acrescente fatos novos. Seja enxuto: é um resumo para revisar rápido.

Responda apenas com HTML usando <h3>, <p>, <ul>, <li> e <strong> (sem markdown, sem blocos de código).`
}
