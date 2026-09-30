import {
  BookOpen,
  Brain,
  CircleCheck,
  Clock,
  Coins,
  Compass,
  Cpu,
  FileText,
  Flag,
  Gavel,
  KeyRound,
  Landmark,
  Layers,
  Lightbulb,
  ListChecks,
  Puzzle,
  Scale,
  Shield,
  Star,
  StickyNote,
  Target,
  TriangleAlert,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { forwardRef, useMemo } from 'react'
import type { MindMap, MindMapCard } from '@/domain/mind-map'
import { normalize } from '@/lib/text'
import { approxMeasure, CARD_PAD, FONT, HEADER_ICON, layoutMindMap, type Measure, type MindMapLayout, type PlacedCard } from './layout'

export const MIND_MAP_FONT = "'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif"

/** Layout do mapa medido com a fonte real do desenho. */
export function useMindMapLayout(map: MindMap | null): MindMapLayout | null {
  return useMemo(() => (map && map.cards.length > 0 ? layoutMindMap(map, createMeasure()) : null), [map])
}

/** Mede texto com canvas (mesma fonte do desenho), com fallback aproximado. */
function createMeasure(): Measure {
  if (typeof document === 'undefined') return approxMeasure
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return approxMeasure
  return (text, fontSize, fontWeight) => {
    ctx.font = `${fontWeight} ${fontSize}px ${MIND_MAP_FONT}`
    return ctx.measureText(text).width
  }
}

/* -------------------------------------------------------------------------- */
/* Cores e ícones                                                             */
/* -------------------------------------------------------------------------- */

interface Palette {
  band: string
  soft: string
  stroke: string
  accent: string
}

const PALETTES: Record<string, Palette> = {
  violet: { band: '#EDE9FE', soft: '#FCFBFF', stroke: '#C4B5FD', accent: '#6D28D9' },
  sky: { band: '#E0F2FE', soft: '#FAFDFF', stroke: '#7DD3FC', accent: '#0369A1' },
  orange: { band: '#FFEDD5', soft: '#FFFCF8', stroke: '#FDBA74', accent: '#C2410C' },
  pink: { band: '#FCE7F3', soft: '#FFFAFD', stroke: '#F9A8D4', accent: '#BE185D' },
  teal: { band: '#CCFBF1', soft: '#F8FEFD', stroke: '#5EEAD4', accent: '#0F766E' },
  rose: { band: '#FFE4E6', soft: '#FFFAFA', stroke: '#FDA4AF', accent: '#E11D48' },
  amber: { band: '#FEF3C7', soft: '#FFFEF7', stroke: '#FCD34D', accent: '#B45309' },
  emerald: { band: '#D1FAE5', soft: '#F8FEFB', stroke: '#6EE7B7', accent: '#047857' },
}
const CONCEPT_ORDER = ['violet', 'sky', 'orange', 'pink', 'teal', 'rose', 'amber', 'emerald']

function paletteFor(card: MindMapCard, conceptIndex: number): Palette {
  if (card.kind === 'checklist') return PALETTES.emerald
  if (card.kind === 'alert') return PALETTES.rose
  if (card.kind === 'notes') return PALETTES.amber
  return PALETTES[CONCEPT_ORDER[conceptIndex % CONCEPT_ORDER.length]]
}

/** Ícone pelo tema do cartão (palavras do título), ou um da sequência. */
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/prazo|tempo|dias|anos|period|vigenc/, Clock],
  [/exce|cuidado|pegadinha|atenc|vedac|proib/, TriangleAlert],
  [/quorum|voto|votac|emenda|aprovac|eleic/, Vote],
  [/crime|pena|penal|prisao|infrac|sanc/, Gavel],
  [/poder|estado|governo|uniao|municip|federa|orgao|legislativ|judiciar|executiv/, Landmark],
  [/lei|artigo|\bart\b|norma|constituic|legal|codigo|sumula/, Scale],
  [/direito|garantia|liberdade|protec|seguranc|remedio|habeas|mandado/, Shield],
  [/conceito|definic|o que e|nocao|fundament/, Lightbulb],
  [/dado|informac|sistema|rede|software|comput|malware|virus|internet|digital/, Cpu],
  [/tribut|imposto|fiscal|financ|orcament|receita|despesa|contab/, Coins],
  [/pessoa|servidor|agente|cidadao|sujeito|parte|legitim/, Users],
  [/document|ato|processo|procedimento|recurso/, FileText],
]
const FALLBACK_ICONS: LucideIcon[] = [BookOpen, Target, Compass, Layers, Puzzle, Star, Flag, KeyRound]

function iconFor(card: MindMapCard, index: number): LucideIcon {
  if (card.kind === 'checklist') return ListChecks
  if (card.kind === 'alert') return TriangleAlert
  if (card.kind === 'notes') return StickyNote
  const text = normalize(card.title)
  return ICON_RULES.find(([re]) => re.test(text))?.[1] ?? FALLBACK_ICONS[index % FALLBACK_ICONS.length]
}

/* -------------------------------------------------------------------------- */
/* Desenho                                                                    */
/* -------------------------------------------------------------------------- */

const baseline = (top: number, line: number) => top + line * 0.76

/** Ligação curva do balão central até a borda do cartão voltada para ele. */
function connector(layout: MindMapLayout, card: PlacedCard): { d: string; end: [number, number] } {
  const c = layout.center
  const cardCx = card.x + card.w / 2
  const cardCy = card.y + card.h / 2
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  if (card.side === 'left' || card.side === 'right') {
    const dir = card.side === 'left' ? -1 : 1
    const sx = c.x + c.w / 2 + dir * (c.w / 2 - 70)
    const sy = clamp(cardCy, c.y + 60, c.y + c.h - 60)
    const ex = card.side === 'left' ? card.x + card.w : card.x
    const dx = Math.abs(ex - sx) * 0.6
    return { d: `M ${sx} ${sy} C ${sx + dir * dx} ${sy}, ${ex - dir * dx} ${cardCy}, ${ex} ${cardCy}`, end: [ex, cardCy] }
  }
  const dir = card.side === 'top' ? -1 : 1
  const sx = clamp(cardCx, c.x + 80, c.x + c.w - 80)
  const sy = c.y + c.h / 2 + dir * (c.h / 2 - 50)
  const ey = card.side === 'top' ? card.y + card.h : card.y
  const dy = Math.abs(ey - sy) * 0.6
  return { d: `M ${sx} ${sy} C ${sx} ${sy + dir * dy}, ${cardCx} ${ey - dir * dy}, ${cardCx} ${ey}`, end: [cardCx, ey] }
}

/** Balão em forma de nuvem: caixa arredondada com "bolhas" nas bordas. */
function cloudCircles(x: number, y: number, w: number, h: number): { cx: number; cy: number; r: number }[] {
  const circles: { cx: number; cy: number; r: number }[] = []
  const bumps = Math.max(4, Math.round(w / 90))
  for (let i = 0; i < bumps; i++) {
    const cx = x + 50 + ((w - 100) * i) / (bumps - 1)
    const r = i % 2 ? 42 : 52
    circles.push({ cx, cy: y + 34, r }, { cx: x + w - (cx - x), cy: y + h - 34, r: i % 2 ? 50 : 40 })
  }
  const side = Math.max(2, Math.round(h / 110))
  for (let i = 0; i < side; i++) {
    const cy = y + 60 + ((h - 120) * i) / Math.max(1, side - 1)
    circles.push({ cx: x + 26, cy, r: 50 }, { cx: x + w - 26, cy, r: 50 })
  }
  return circles
}

/**
 * Infográfico do assunto em SVG autocontido (cores e fontes inline), para
 * poder ser exportado como imagem sem depender do CSS da página.
 */
export const MindMapSvg = forwardRef<SVGSVGElement, { map: MindMap; layout: MindMapLayout; className?: string; style?: React.CSSProperties }>(
  function MindMapSvg({ map, layout, className, style }, ref) {
    const { minX, minY, width, height } = layout.bounds
    const c = layout.center
    let concept = 0
    const styled = layout.cards.map((card) => ({
      card,
      palette: paletteFor(card.card, card.card.kind === 'concept' ? concept++ : 0),
      Icon: iconFor(card.card, card.index),
    }))
    const cloud = cloudCircles(c.x, c.y, c.w, c.h)

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${minX} ${minY} ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`Mapa mental: ${map.title}`}
        className={className}
        style={style}
        fontFamily={MIND_MAP_FONT}
      >
        <defs>
          <pattern id="mm-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.1" fill="#EAEAF0" />
          </pattern>
        </defs>
        <rect x={minX} y={minY} width={width} height={height} fill="#FFFFFF" />
        <rect x={minX} y={minY} width={width} height={height} fill="url(#mm-dots)" />

        {/* Ligações (por trás de tudo) */}
        <g fill="none" strokeLinecap="round">
          {styled.map(({ card, palette }) => {
            const { d } = connector(layout, card)
            return <path key={`l-${card.index}`} d={d} stroke={palette.stroke} strokeWidth={5} />
          })}
        </g>

        {/* Balão central */}
        <g>
          <g fill="#7C3AED" fillOpacity={0.18} transform="translate(0 10)">
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={60} />
            {cloud.map((b, i) => (
              <circle key={i} cx={b.cx} cy={b.cy} r={b.r} />
            ))}
          </g>
          <g fill="#1B1530">
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={60} />
            {cloud.map((b, i) => (
              <circle key={i} cx={b.cx} cy={b.cy} r={b.r} />
            ))}
          </g>
          <circle cx={c.x + c.w / 2} cy={c.y + 34} r={30} fill="#FFFFFF" />
          <Brain x={c.x + c.w / 2 - 17} y={c.y + 17} width={34} height={34} color="#7C3AED" strokeWidth={2} />
          <text textAnchor="middle" fill="#FFFFFF" fontSize={FONT.center.size} fontWeight={FONT.center.weight} letterSpacing="0.5">
            {c.titleLines.map((line, i) => (
              <tspan key={i} x={c.x + c.w / 2} y={baseline(c.y + 84 + i * FONT.center.line, FONT.center.line)}>
                {line}
              </tspan>
            ))}
          </text>
          <text
            x={c.x + c.w / 2}
            y={baseline(c.y + 94 + c.titleLines.length * FONT.center.line, FONT.centerSub.line)}
            textAnchor="middle"
            fill="#F0ABFC"
            fontSize={FONT.centerSub.size}
            fontWeight={FONT.centerSub.weight}
          >
            {c.subtitle}
          </text>
          {c.descLines.length > 0 && (
            <text textAnchor="middle" fill="#E4E4E7" fontSize={FONT.centerDesc.size} fontWeight={FONT.centerDesc.weight}>
              {c.descLines.map((line, i) => (
                <tspan
                  key={i}
                  x={c.x + c.w / 2}
                  y={baseline(c.y + 108 + c.titleLines.length * FONT.center.line + FONT.centerSub.line + i * FONT.centerDesc.line, FONT.centerDesc.line)}
                >
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </g>

        {/* Pontas das ligações */}
        {styled.map(({ card, palette }) => {
          const [ex, ey] = connector(layout, card).end
          return <circle key={`p-${card.index}`} cx={ex} cy={ey} r={6} fill={palette.stroke} />
        })}

        {/* Cartões */}
        {styled.map(({ card, palette, Icon }) => {
          const { x, y, w, h } = card
          const textX = x + CARD_PAD + 16
          return (
            <g key={card.index}>
              <rect x={x + 3} y={y + 5} width={w} height={h} rx={20} fill={palette.accent} fillOpacity={0.08} />
              <rect x={x} y={y} width={w} height={h} rx={20} fill={palette.soft} />
              {/* Faixa do título (cantos de cima arredondados) */}
              <path d={`M ${x} ${y + card.headerH} V ${y + 20} Q ${x} ${y} ${x + 20} ${y} H ${x + w - 20} Q ${x + w} ${y} ${x + w} ${y + 20} V ${y + card.headerH} Z`} fill={palette.band} />
              <rect x={x} y={y} width={w} height={h} rx={20} fill="none" stroke={palette.stroke} strokeWidth={2} />
              <Icon
                x={x + CARD_PAD - 2}
                y={y + card.headerH / 2 - HEADER_ICON / 2}
                width={HEADER_ICON}
                height={HEADER_ICON}
                color={palette.accent}
                strokeWidth={1.9}
              />
              <text fill={palette.accent} fontSize={FONT.title.size} fontWeight={FONT.title.weight} letterSpacing="0.3">
                {card.titleLines.map((line, i) => (
                  <tspan
                    key={i}
                    x={x + CARD_PAD + HEADER_ICON + 10}
                    y={baseline(y + card.headerH / 2 - (card.titleLines.length * FONT.title.line) / 2 + i * FONT.title.line, FONT.title.line)}
                  >
                    {line}
                  </tspan>
                ))}
              </text>

              {card.items.map((item, i) => {
                const top = y + item.y
                const textTop = top + item.heading.length * FONT.heading.line + (item.heading.length ? 3 : 0)
                let row = 0
                return (
                  <g key={i}>
                    {card.card.kind === 'checklist' ? (
                      <CircleCheck x={x + CARD_PAD - 2} y={top + 1} width={15} height={15} color="#16A34A" strokeWidth={2.4} />
                    ) : card.card.kind === 'alert' ? (
                      <TriangleAlert x={x + CARD_PAD - 2} y={top + 1} width={15} height={15} color="#DC2626" strokeWidth={2.4} />
                    ) : (
                      <circle cx={x + CARD_PAD + 5} cy={top + 9} r={4.5} fill={palette.accent} />
                    )}
                    {item.heading.length > 0 && (
                      <text fill="#18181B" fontSize={FONT.heading.size} fontWeight={FONT.heading.weight}>
                        {item.heading.map((line, j) => (
                          <tspan key={j} x={textX} y={baseline(top + j * FONT.heading.line, FONT.heading.line)}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    )}
                    <text fill="#3F3F46" fontSize={FONT.text.size} fontWeight={FONT.text.weight}>
                      {item.lines.flatMap((wrapped, j) =>
                        wrapped.map((line, k) => (
                          <tspan key={`${j}-${k}`} x={textX} y={baseline(textTop + row++ * FONT.text.line, FONT.text.line)}>
                            {line}
                          </tspan>
                        )),
                      )}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        <text x={minX + width - 28} y={minY + height - 16} textAnchor="end" fontSize="11.5" fill="#A1A1AA">
          Mapa mental · {map.subtitle} · gerado a partir do seu resumo no Aprova
        </text>
      </svg>
    )
  },
)
