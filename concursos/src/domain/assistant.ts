import { htmlToText } from '@/lib/text'
import { escapeHtml, sanitizeSummaryHtml } from './sanitize-html'
import { htmlToNodes } from './mind-map'
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
