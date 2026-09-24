import { splitSentences } from './sentences'
import { parseHtml, textOf, type HtmlNode } from './html'

/**
 * Mapa mental a partir do resumo do usuário.
 *
 * Não usa IA: organiza o que o usuário escreveu. O assunto fica no centro,
 * cada campo do resumo vira um ramo, títulos viram sub-ramos, itens de lista
 * e frases viram folhas. Trechos no formato "Rótulo: explicação" viram um nó
 * com a explicação como filho — o formato típico de anotações de estudo.
 */

export interface MindMapNode {
  label: string
  children: MindMapNode[]
}

export interface MindMapBranch extends MindMapNode {
  key: string
  color: string
}

export interface MindMap {
  title: string
  subtitle: string
  branches: MindMapBranch[]
}

export interface MindMapSection {
  key: string
  label: string
  color: string
  html: string
}

const clean = (text: string) => text.replace(/\s+/g, ' ').replace(/^[\s•\-–]+/, '').trim()

/* -------------------------------------------------------------------------- */
/* Conversão para a árvore do mapa                                            */
/* -------------------------------------------------------------------------- */

const MAX_LABEL = 72

export function shorten(text: string, max = MAX_LABEL): string {
  const t = clean(text).replace(/[.;]+$/, '')
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 12))}…`
}

/** "Habeas corpus: protege a liberdade" → nó "Habeas corpus" com filho "protege a liberdade". */
function labelled(text: string): MindMapNode {
  const t = clean(text).replace(/[.;]+$/, '')
  const m = t.match(/^(.{2,48}?)\s*(?::|\s[–-]|=>|→)\s+(.{2,})$/)
  if (m && !/\d$/.test(m[1])) {
    const detail = m[2].charAt(0).toUpperCase() + m[2].slice(1)
    return { label: shorten(m[1], 48), children: [{ label: shorten(detail), children: [] }] }
  }
  return { label: shorten(t), children: [] }
}

function sentences(text: string): string[] {
  return splitSentences(clean(text))
    .map(clean)
    .filter((s) => s.replace(/[^\p{L}\p{N}]/gu, '').length > 1)
}

function listItems(list: HtmlNode): MindMapNode[] {
  return list.children
    .filter((c): c is HtmlNode => typeof c !== 'string' && c.tag === 'li')
    .map((li) => {
      const node = labelled(textOf(li))
      const nested = collectLists(li).flatMap(listItems)
      node.children.push(...nested)
      return node
    })
    .filter((n) => n.label)
}

function collectLists(node: HtmlNode): HtmlNode[] {
  const found: HtmlNode[] = []
  for (const c of node.children) {
    if (typeof c === 'string') continue
    if (c.tag === 'ul' || c.tag === 'ol') found.push(c)
    else if (c.tag !== 'li') found.push(...collectLists(c))
  }
  return found
}

/** Converte o HTML de um campo do resumo em nós do mapa. */
export function htmlToNodes(html: string): MindMapNode[] {
  const root = parseHtml(html)
  const result: MindMapNode[] = []
  let h2: MindMapNode | null = null
  let h3: MindMapNode | null = null
  const target = () => (h3 ?? h2)?.children ?? result

  const visit = (nodes: (HtmlNode | string)[]) => {
    for (const node of nodes) {
      if (typeof node === 'string') {
        for (const s of sentences(node)) target().push(labelled(s))
        continue
      }
      const text = clean(textOf(node))
      switch (node.tag) {
        case 'h2':
        case 'h1':
          if (!text) break
          h2 = { label: shorten(text, 48), children: [] }
          h3 = null
          result.push(h2)
          break
        case 'h3':
          if (!text) break
          h3 = { label: shorten(text, 48), children: [] }
          ;(h2?.children ?? result).push(h3)
          break
        case 'ul':
        case 'ol':
          target().push(...listItems(node))
          break
        case 'p':
        case 'blockquote':
          for (const s of sentences(textOf(node))) target().push(labelled(s))
          break
        default:
          visit(node.children)
      }
    }
  }
  visit(root.children)
  return result
}

/** Limita largura e profundidade para o mapa continuar legível. */
function prune(nodes: MindMapNode[], depth: number, maxChildren: number, maxDepth: number): MindMapNode[] {
  const kept = nodes.slice(0, maxChildren).map((n) => ({
    label: n.label,
    children: depth >= maxDepth ? [] : prune(n.children, depth + 1, Math.max(3, maxChildren - 2), maxDepth),
  }))
  if (nodes.length > maxChildren) kept.push({ label: `+${nodes.length - maxChildren} itens`, children: [] })
  return kept
}

export function buildMindMap(input: { title: string; subtitle: string; sections: MindMapSection[] }): MindMap {
  const branches = input.sections
    .map((section) => ({
      key: section.key,
      color: section.color,
      label: section.label,
      children: prune(htmlToNodes(section.html), 2, 8, 4),
    }))
    .filter((b) => b.children.length > 0)
  return { title: input.title, subtitle: input.subtitle, branches }
}
