import type { MindMap, MindMapNode } from '@/domain/mind-map'

/**
 * Layout do mapa mental: o assunto no centro, ramos distribuídos à direita e à
 * esquerda (equilibrando a altura), cada nível mais afastado do centro.
 * Cada subárvore ocupa a soma das alturas dos filhos, então nada se sobrepõe.
 */

export type NodeKind = 'root' | 'branch' | 'group' | 'leaf'

export interface PlacedNode {
  id: string
  kind: NodeKind
  lines: string[]
  color: string
  /** centro do nó */
  x: number
  y: number
  w: number
  h: number
  side: 1 | -1
  fontSize: number
  fontWeight: number
  lineHeight: number
  parent: PlacedNode | null
}

export interface MindMapLayout {
  nodes: PlacedNode[]
  bounds: { minX: number; minY: number; width: number; height: number }
}

export type Measure = (text: string, fontSize: number, fontWeight: number) => number

/** Medida aproximada (usada fora do navegador). */
export const approxMeasure: Measure = (text, fontSize, fontWeight) => text.length * fontSize * (fontWeight >= 600 ? 0.58 : 0.53)

const STYLE: Record<NodeKind, { fontSize: number; fontWeight: number; maxWidth: number; padX: number; padY: number; lineHeight: number }> = {
  root: { fontSize: 22, fontWeight: 800, maxWidth: 260, padX: 26, padY: 18, lineHeight: 28 },
  branch: { fontSize: 16, fontWeight: 700, maxWidth: 200, padX: 18, padY: 11, lineHeight: 21 },
  group: { fontSize: 14, fontWeight: 650, maxWidth: 220, padX: 14, padY: 9, lineHeight: 19 },
  leaf: { fontSize: 13.5, fontWeight: 500, maxWidth: 240, padX: 12, padY: 8, lineHeight: 18 },
}

const H_GAP = 56
const V_GAP = 12

function wrap(text: string, maxWidth: number, fontSize: number, fontWeight: number, measure: Measure, maxLines = 4): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (current && measure(next, fontSize, fontWeight) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,.;:]+$/, '')}…`
  }
  return lines
}

interface Sized {
  node: MindMapNode
  kind: NodeKind
  lines: string[]
  w: number
  h: number
  subtree: number
  children: Sized[]
}

function size(node: MindMapNode, kind: NodeKind, measure: Measure): Sized {
  const s = STYLE[kind]
  const lines = wrap(node.label, s.maxWidth, s.fontSize, s.fontWeight, measure)
  const textWidth = Math.max(...lines.map((l) => measure(l, s.fontSize, s.fontWeight)))
  const w = Math.ceil(textWidth + s.padX * 2)
  const h = Math.ceil(lines.length * s.lineHeight + s.padY * 2)
  const children = node.children.map((c) => size(c, c.children.length > 0 ? 'group' : 'leaf', measure))
  const childrenHeight = children.reduce((sum, c) => sum + c.subtree, 0) + V_GAP * Math.max(0, children.length - 1)
  return { node, kind, lines, w, h, subtree: Math.max(h, childrenHeight), children }
}

export function layoutMindMap(map: MindMap, measure: Measure = approxMeasure): MindMapLayout {
  const nodes: PlacedNode[] = []
  const rootSized = size({ label: map.title, children: [] }, 'root', measure)
  const root = place(rootSized, 0, 0, 1, '#09090B', null, 'root')

  const branches = map.branches.map((b) => ({ branch: b, sized: size(b, 'branch', measure) }))

  // Distribui os ramos entre direita e esquerda equilibrando a altura total
  const right: typeof branches = []
  const left: typeof branches = []
  let rightH = 0
  let leftH = 0
  for (const item of branches) {
    if (rightH <= leftH) {
      right.push(item)
      rightH += item.sized.subtree + V_GAP * 3
    } else {
      left.push(item)
      leftH += item.sized.subtree + V_GAP * 3
    }
  }

  for (const [side, items, total] of [
    [1, right, rightH],
    [-1, left, leftH],
  ] as const) {
    let top = -(total - V_GAP * 3) / 2
    items.forEach(({ branch, sized }, i) => {
      const cy = top + sized.subtree / 2
      const cx = side * (rootSized.w / 2 + H_GAP * 1.4 + sized.w / 2)
      const placed = place(sized, cx, cy, side, branch.color, root, `b${side}-${i}`)
      layoutChildren(sized, placed, side, branch.color)
      top += sized.subtree + V_GAP * 3
    })
  }

  function place(s: Sized, x: number, y: number, side: 1 | -1, color: string, parent: PlacedNode | null, id: string): PlacedNode {
    const st = STYLE[s.kind]
    const node: PlacedNode = { id, kind: s.kind, lines: s.lines, color, x, y, w: s.w, h: s.h, side, fontSize: st.fontSize, fontWeight: st.fontWeight, lineHeight: st.lineHeight, parent }
    nodes.push(node)
    return node
  }

  function layoutChildren(s: Sized, parent: PlacedNode, side: 1 | -1, color: string) {
    const total = s.children.reduce((sum, c) => sum + c.subtree, 0) + V_GAP * Math.max(0, s.children.length - 1)
    let top = parent.y - total / 2
    s.children.forEach((child, i) => {
      const cy = top + child.subtree / 2
      const cx = parent.x + side * (parent.w / 2 + H_GAP + child.w / 2)
      const placed = place(child, cx, cy, side, color, parent, `${parent.id}-${i}`)
      layoutChildren(child, placed, side, color)
      top += child.subtree + V_GAP
    })
  }

  const margin = 40
  const minX = Math.min(...nodes.map((n) => n.x - n.w / 2)) - margin
  const maxX = Math.max(...nodes.map((n) => n.x + n.w / 2)) + margin
  const minY = Math.min(...nodes.map((n) => n.y - n.h / 2)) - margin
  const maxY = Math.max(...nodes.map((n) => n.y + n.h / 2)) + margin
  return { nodes, bounds: { minX, minY, width: maxX - minX, height: maxY - minY } }
}
