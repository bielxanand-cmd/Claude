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

export type MindMapCardKind = 'concept' | 'checklist' | 'alert' | 'notes'

/** Um tópico dentro do cartão: título em negrito (opcional) e as linhas de texto. */
export interface MindMapItem {
  heading?: string
  lines: string[]
}

/** Cartão do infográfico: um conceito do resumo com seus tópicos. */
export interface MindMapCard {
  title: string
  kind: MindMapCardKind
  items: MindMapItem[]
}

/**
 * Mapa mental em formato de infográfico: o assunto no centro (com uma frase
 * de definição, quando houver) e um cartão por conceito ao redor.
 */
export interface MindMap {
  title: string
  subtitle: string
  description: string
  cards: MindMapCard[]
}

export interface MindMapSection {
  key: string
  label: string
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
function labelled(text: string, max = MAX_LABEL): MindMapNode {
  const t = clean(text).replace(/[.;]+$/, '')
  const m = t.match(/^(.{2,48}?)\s*(?::|\s[–-]|=>|→)\s+(.{2,})$/)
  if (m && !/\d$/.test(m[1])) {
    const detail = m[2].charAt(0).toUpperCase() + m[2].slice(1)
    return { label: shorten(m[1], 48), children: [{ label: shorten(detail, max), children: [] }] }
  }
  return { label: shorten(t, max), children: [] }
}

function sentences(text: string): string[] {
  return splitSentences(clean(text))
    .map(clean)
    .filter((s) => s.replace(/[^\p{L}\p{N}]/gu, '').length > 1)
}

function listItems(list: HtmlNode, max: number): MindMapNode[] {
  return list.children
    .filter((c): c is HtmlNode => typeof c !== 'string' && c.tag === 'li')
    .map((li) => {
      const node = labelled(ownText(li), max)
      const nested = collectLists(li).flatMap((l) => listItems(l, max))
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

/** Texto de um item de lista sem as sublistas (elas viram filhos). */
function ownText(li: HtmlNode): string {
  const strip = (node: HtmlNode): HtmlNode => ({
    ...node,
    children: node.children.filter((c) => typeof c === 'string' || (c.tag !== 'ul' && c.tag !== 'ol')).map((c) => (typeof c === 'string' ? c : strip(c))),
  })
  return textOf(strip(li))
}

/** Converte o HTML de um campo do resumo em nós do mapa. */
export function htmlToNodes(html: string, max = MAX_LABEL): MindMapNode[] {
  const root = parseHtml(html)
  const result: MindMapNode[] = []
  let h2: MindMapNode | null = null
  let h3: MindMapNode | null = null
  const target = () => (h3 ?? h2)?.children ?? result

  const visit = (nodes: (HtmlNode | string)[]) => {
    for (const node of nodes) {
      if (typeof node === 'string') {
        for (const s of sentences(node)) target().push(labelled(s, max))
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
          target().push(...listItems(node, max))
          break
        case 'p':
        case 'blockquote':
          for (const s of sentences(textOf(node))) target().push(labelled(s, max))
          break
        default:
          visit(node.children)
      }
    }
  }
  visit(root.children)
  return result
}

/* -------------------------------------------------------------------------- */
/* Infográfico: cartões por conceito                                          */
/* -------------------------------------------------------------------------- */

const CARD_TEXT = 200
const MAX_CARDS = 12
const MAX_ITEMS = 7
const MAX_LINES = 4

const KIND_BY_SECTION: Record<string, MindMapCardKind> = { keyPoints: 'checklist', pitfalls: 'alert', notes: 'notes' }

/** Folhas de uma subárvore, em ordem (para caber num tópico do cartão). */
function flatten(nodes: MindMapNode[]): string[] {
  return nodes.flatMap((n) => (n.children.length ? [n.label, ...flatten(n.children)] : [n.label]))
}

function toItem(node: MindMapNode): MindMapItem {
  if (node.children.length === 0) return { lines: [node.label] }
  const lines = flatten(node.children)
  const extra = lines.length - MAX_LINES
  return { heading: node.label, lines: extra > 0 ? [...lines.slice(0, MAX_LINES - 1), `+${extra + 1} detalhes`] : lines }
}

function limitItems(items: MindMapItem[]): MindMapItem[] {
  if (items.length <= MAX_ITEMS) return items
  return [...items.slice(0, MAX_ITEMS - 1), { lines: [`+${items.length - MAX_ITEMS + 1} itens no resumo`] }]
}

/** Nó que merece cartão próprio: título com vários tópicos ou com subníveis. */
const isConcept = (n: MindMapNode) => n.children.length >= 2 || n.children.some((c) => c.children.length > 0)

export function buildMindMap(input: { title: string; subtitle: string; sections: MindMapSection[] }): MindMap {
  const cards: MindMapCard[] = []
  let description = ''
  input.sections.forEach((section, index) => {
    const kind = KIND_BY_SECTION[section.key] ?? 'concept'
    const nodes = htmlToNodes(section.html, CARD_TEXT)
    // Frase de abertura do resumo ("X é ...") vira a definição no centro
    if (index === 0 && !description && nodes[0] && nodes[0].children.length === 0 && nodes[0].label.length >= 30) {
      description = nodes.shift()!.label
    }
    // Tema do assunto: sempre um cartão próprio, com todos os tópicos dele
    if (section.key === 'theme') {
      if (nodes.length) cards.push({ title: section.label, kind: 'concept', items: limitItems(nodes.map(toItem)) })
      return
    }
    const loose: MindMapItem[] = []
    for (const node of nodes) {
      if (isConcept(node)) cards.push({ title: node.label, kind: kind === 'notes' ? 'concept' : kind, items: limitItems(node.children.map(toItem)) })
      else loose.push(toItem(node))
    }
    // Itens soltos do campo formam um cartão com o nome do campo
    if (loose.length) cards.push({ title: section.label, kind, items: limitItems(loose) })
  })
  const kept = cards.slice(0, MAX_CARDS)
  return { title: input.title, subtitle: input.subtitle, description, cards: kept }
}
