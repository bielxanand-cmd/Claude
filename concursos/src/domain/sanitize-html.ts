import { parseHtml, type HtmlNode } from './html'

/**
 * Reconstrói um HTML aceitando só as tags que o editor de resumos usa, sem
 * nenhum atributo. Usado para conteúdo que vem de fora (ex.: resposta da IA).
 */
const ALLOWED = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'u', 'mark', 'blockquote', 'br'])
const RENAME: Record<string, string> = { b: 'strong', i: 'em', h1: 'h2', h4: 'h3', h5: 'h3', h6: 'h3' }

export const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function render(node: HtmlNode | string): string {
  if (typeof node === 'string') return escapeHtml(node)
  const inner = node.children.map(render).join('')
  const tag = RENAME[node.tag] ?? node.tag
  if (tag === 'script' || tag === 'style') return ''
  if (!ALLOWED.has(tag)) return inner
  return `<${tag}>${inner}</${tag}>`
}

export function sanitizeSummaryHtml(html: string): string {
  const out = parseHtml(html).children.map(render).join('').trim()
  // Texto solto sem bloco vira parágrafo
  return out && !out.startsWith('<') ? `<p>${out}</p>` : out
}
