import { forwardRef, useMemo } from 'react'
import type { MindMap } from '@/domain/mind-map'
import { approxMeasure, layoutMindMap, type Measure, type MindMapLayout, type PlacedNode } from './layout'

export const MIND_MAP_FONT = "'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif"

/** Layout do mapa medido com a fonte real do desenho. */
export function useMindMapLayout(map: MindMap | null): MindMapLayout | null {
  return useMemo(() => (map && map.branches.length > 0 ? layoutMindMap(map, createMeasure()) : null), [map])
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

const HEADER = 64

function edgePath(parent: PlacedNode, child: PlacedNode): string {
  const side = child.side
  const sx = parent.kind === 'root' ? parent.x + side * (parent.w / 2 - 12) : parent.x + side * (parent.w / 2)
  const sy = parent.y
  const ex = child.x - side * (child.w / 2)
  const ey = child.y
  const dx = Math.abs(ex - sx) * 0.55
  return `M ${sx} ${sy} C ${sx + side * dx} ${sy}, ${ex - side * dx} ${ey}, ${ex} ${ey}`
}

function depthOf(node: PlacedNode): number {
  let d = 0
  for (let p = node.parent; p; p = p.parent) d++
  return d
}

/**
 * Desenho do mapa mental em SVG autocontido (cores e fontes inline), para
 * poder ser exportado como imagem sem depender do CSS da página.
 */
export const MindMapSvg = forwardRef<
  SVGSVGElement,
  { map: MindMap; layout: MindMapLayout; className?: string; style?: React.CSSProperties }
>(function MindMapSvg({ map, layout, className, style }, ref) {
  const { minX, minY, width, height } = layout.bounds
  const vbY = minY - HEADER
  const vbH = height + HEADER + 28

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${minX} ${vbY} ${width} ${vbH}`}
      width={width}
      height={vbH}
      role="img"
      aria-label={`Mapa mental: ${map.title}`}
      className={className}
      style={style}
      fontFamily={MIND_MAP_FONT}
    >
      <defs>
        <pattern id="mm-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="#E4E4EA" />
        </pattern>
      </defs>
      <rect x={minX} y={vbY} width={width} height={vbH} fill="#FFFFFF" />
      <rect x={minX} y={vbY} width={width} height={vbH} fill="url(#mm-dots)" />

      {/* Cabeçalho */}
      <text x={minX + 32} y={vbY + 34} fontSize="12" fontWeight="700" fill="#7C3AED" letterSpacing="1.2">
        MAPA MENTAL
      </text>
      <text x={minX + 32} y={vbY + 53} fontSize="13" fontWeight="500" fill="#71717A">
        {map.subtitle}
      </text>

      {/* Ligações */}
      <g fill="none" strokeLinecap="round">
        {layout.nodes
          .filter((n) => n.parent)
          .map((n) => {
            const depth = depthOf(n)
            return (
              <path
                key={`e-${n.id}`}
                d={edgePath(n.parent!, n)}
                stroke={n.color}
                strokeWidth={depth === 1 ? 4 : depth === 2 ? 2.5 : 1.75}
                strokeOpacity={depth === 1 ? 0.85 : 0.55}
              />
            )
          })}
      </g>

      {/* Nós */}
      {layout.nodes.map((n) => {
        const left = n.x - n.w / 2
        const top = n.y - n.h / 2
        const firstBaseline = n.y - (n.lines.length * n.lineHeight) / 2 + n.lineHeight * 0.74
        const palette =
          n.kind === 'root'
            ? { fill: '#09090B', stroke: '#7C3AED', text: '#FFFFFF', fillOpacity: 1, strokeOpacity: 0.35, strokeWidth: 6 }
            : n.kind === 'branch'
              ? { fill: n.color, stroke: n.color, text: '#FFFFFF', fillOpacity: 1, strokeOpacity: 0, strokeWidth: 0 }
              : n.kind === 'group'
                ? { fill: n.color, stroke: n.color, text: '#18181B', fillOpacity: 0.1, strokeOpacity: 0.55, strokeWidth: 1.5 }
                : { fill: '#FFFFFF', stroke: n.color, text: '#3F3F46', fillOpacity: 1, strokeOpacity: 0.3, strokeWidth: 1.25 }
        return (
          <g key={n.id}>
            {n.kind === 'leaf' && <rect x={left} y={top} width={n.w} height={n.h} rx={10} fill="#FFFFFF" />}
            <rect
              x={left}
              y={top}
              width={n.w}
              height={n.h}
              rx={n.kind === 'root' ? Math.min(n.h / 2, 26) : n.kind === 'branch' ? 14 : 10}
              fill={palette.fill}
              fillOpacity={palette.fillOpacity}
              stroke={palette.stroke}
              strokeOpacity={palette.strokeOpacity}
              strokeWidth={palette.strokeWidth}
            />
            <text textAnchor="middle" fontSize={n.fontSize} fontWeight={n.fontWeight} fill={palette.text}>
              {n.lines.map((line, i) => (
                <tspan key={i} x={n.x} y={firstBaseline + i * n.lineHeight}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}

      <text x={minX + width - 32} y={vbY + vbH - 16} textAnchor="end" fontSize="11" fill="#A1A1AA">
        Gerado a partir do seu resumo · Aprova
      </text>
    </svg>
  )
})
