import type { MindMap, MindMapCard } from '@/domain/mind-map'

/**
 * Layout do infográfico: o assunto num "balão" no centro, um cartão à
 * esquerda e outro à direita dele, e os demais cartões em faixas acima e
 * abaixo (em colunas, como um mural), todos ligados ao centro.
 */

export type Measure = (text: string, fontSize: number, fontWeight: number) => number

/** Medida aproximada (usada fora do navegador). */
export const approxMeasure: Measure = (text, fontSize, fontWeight) => text.length * fontSize * (fontWeight >= 600 ? 0.58 : 0.53)

export const CARD_W = 300
const GAP = 30
const CENTER_W = CARD_W * 2 + GAP
export const CARD_PAD = 18
const TEXT_W = CARD_W - CARD_PAD * 2 - 16
/** Os cartões ao lado do balão ficam um pouco mais afastados (as "nuvens" passam da caixa) */
const SIDE_OFFSET = 44

export const FONT = {
  title: { size: 17, weight: 800, line: 21 },
  heading: { size: 13.5, weight: 700, line: 18 },
  text: { size: 13, weight: 500, line: 17.5 },
  center: { size: 34, weight: 800, line: 38 },
  centerSub: { size: 15, weight: 700, line: 20 },
  centerDesc: { size: 15, weight: 500, line: 21 },
}
export const HEADER_ICON = 34
const ITEM_GAP = 10

export interface PlacedItem {
  heading: string[]
  lines: string[][]
  /** topo do item (relativo ao cartão) */
  y: number
}

export interface PlacedCard {
  card: MindMapCard
  index: number
  x: number
  y: number
  w: number
  h: number
  titleLines: string[]
  headerH: number
  items: PlacedItem[]
  /** De que lado do centro o cartão está (para a ligação) */
  side: 'top' | 'bottom' | 'left' | 'right'
}

export interface PlacedCenter {
  x: number
  y: number
  w: number
  h: number
  titleLines: string[]
  subtitle: string
  descLines: string[]
}

export interface MindMapLayout {
  center: PlacedCenter
  cards: PlacedCard[]
  bounds: { minX: number; minY: number; width: number; height: number }
}

export function wrap(text: string, maxWidth: number, fontSize: number, fontWeight: number, measure: Measure, maxLines = 6): string[] {
  const words = text.split(/\s+/).filter(Boolean)
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

function sizeCard(card: MindMapCard, index: number, measure: Measure): Omit<PlacedCard, 'x' | 'y' | 'side'> {
  const { title, heading, text } = FONT
  const titleLines = wrap(card.title.toLocaleUpperCase('pt-BR'), CARD_W - CARD_PAD * 2 - HEADER_ICON - 12, title.size, title.weight, measure, 3)
  const headerH = Math.max(HEADER_ICON, titleLines.length * title.line) + CARD_PAD * 2 - 4
  let y = headerH + 12
  const items: PlacedItem[] = card.items.map((item) => {
    const placed: PlacedItem = {
      heading: item.heading ? wrap(item.heading, TEXT_W, heading.size, heading.weight, measure, 3) : [],
      lines: item.lines.map((l) => wrap(l, TEXT_W, text.size, text.weight, measure, 5)),
      y,
    }
    y += placed.heading.length * heading.line + placed.lines.reduce((n, l) => n + l.length, 0) * text.line + (placed.heading.length && placed.lines.length ? 3 : 0) + ITEM_GAP
    return placed
  })
  return { card, index, w: CARD_W, h: Math.ceil(y - ITEM_GAP + CARD_PAD), titleLines, headerH, items }
}

function sizeCenter(map: MindMap, measure: Measure): Omit<PlacedCenter, 'x' | 'y'> {
  const titleLines = wrap(map.title.toLocaleUpperCase('pt-BR'), CENTER_W - 150, FONT.center.size, FONT.center.weight, measure, 3)
  const descLines = map.description ? wrap(map.description, CENTER_W - 170, FONT.centerDesc.size, FONT.centerDesc.weight, measure, 5) : []
  const h = 70 + 44 + titleLines.length * FONT.center.line + 10 + FONT.centerSub.line + (descLines.length ? 14 + descLines.length * FONT.centerDesc.line : 0)
  return { w: CENTER_W, h: Math.max(h, 230), titleLines, subtitle: map.subtitle, descLines }
}

/** Distribui cartões em colunas (sempre na mais baixa), como um mural. */
function masonry(cards: Omit<PlacedCard, 'x' | 'y' | 'side'>[], columns: number) {
  const cols = Array.from({ length: columns }, () => ({ height: 0, cards: [] as typeof cards }))
  for (const card of cards) {
    const col = cols.reduce((a, b) => (b.height < a.height ? b : a))
    col.cards.push(card)
    col.height += card.h + GAP
  }
  return cols
}

export function layoutMindMap(map: MindMap, measure: Measure = approxMeasure): MindMapLayout {
  const sized = map.cards.map((c, i) => sizeCard(c, i, measure))
  const c = sizeCenter(map, measure)
  const colX = (i: number) => i * (CARD_W + GAP)
  const cards: PlacedCard[] = []

  // Faixa do meio: um cartão de cada lado do centro
  const [left, right, ...rest] = sized
  const midH = Math.max(c.h, left?.h ?? 0, right?.h ?? 0)
  const center: PlacedCenter = { ...c, x: colX(1), y: (midH - c.h) / 2 }
  if (left) cards.push({ ...left, x: colX(0) - SIDE_OFFSET, y: (midH - left.h) / 2, side: 'left' })
  if (right) cards.push({ ...right, x: colX(3) + SIDE_OFFSET, y: (midH - right.h) / 2, side: 'right' })

  // Faixas de cima e de baixo (centralizadas quando têm menos de 4 colunas)
  const half = Math.ceil(rest.length / 2)
  for (const [band, items] of [
    ['top', rest.slice(0, half)],
    ['bottom', rest.slice(half)],
  ] as const) {
    if (!items.length) continue
    const columns = Math.min(4, items.length)
    const offset = ((4 - columns) * (CARD_W + GAP)) / 2
    masonry(items, columns).forEach((col, i) => {
      if (band === 'top') {
        // Colunas de cima encostam por baixo, perto do centro
        let y = -GAP * 1.6
        for (const card of [...col.cards].reverse()) {
          y -= card.h
          cards.push({ ...card, x: offset + colX(i), y, side: 'top' })
          y -= GAP
        }
      } else {
        let y = midH + GAP * 1.6
        for (const card of col.cards) {
          cards.push({ ...card, x: offset + colX(i), y, side: 'bottom' })
          y += card.h + GAP
        }
      }
    })
  }
  cards.sort((a, b) => a.index - b.index)

  const margin = 36
  const boxes = [center, ...cards]
  // Espaço extra do balão (as "nuvens" passam um pouco da caixa)
  const minX = Math.min(...boxes.map((b) => b.x), center.x - 20) - margin
  const maxX = Math.max(...boxes.map((b) => b.x + b.w), center.x + center.w + 20) + margin
  const minY = Math.min(...boxes.map((b) => b.y), center.y - 30) - margin
  const maxY = Math.max(...boxes.map((b) => b.y + b.h), center.y + center.h + 30) + margin + 22
  return { center, cards, bounds: { minX, minY, width: maxX - minX, height: maxY - minY } }
}
