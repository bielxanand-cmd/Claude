import { createContext, useContext, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import DOMPurify from 'dompurify'
import logoInk from '@/assets/brand/cibus-logo-ink.png'
import logoWhite from '@/assets/brand/cibus-logo-white.png'
import cifraoWhite from '@/assets/brand/cibus-cifrao-white.png'
import { cn } from '@/lib/utils'

export const SLIDE_W = 1280
export const SLIDE_H = 720

/* ---------------------------------------------------------------------------
 * Relato de excesso de conteúdo — os slides avisam o editor quando um bloco
 * não coube mesmo depois de reduzir a fonte até o mínimo legível.
 * ------------------------------------------------------------------------- */

export type OverflowReport = (id: string, overflowing: boolean, label: string) => void
export const OverflowContext = createContext<OverflowReport | null>(null)

/** Contexto do link clicável (slides no app x PDF). */
export const SlideModeContext = createContext<'screen' | 'export'>('screen')

/** Tema do produto (Fuel / Partner) aplicado a cada slide. */
export interface SlideTheme {
  vars: Record<string, string>
  productKey: 'fuel' | 'partner'
}
export const SlideThemeContext = createContext<SlideTheme | null>(null)

/**
 * Caixa que reduz a fonte automaticamente até o conteúdo caber.
 * Se ainda assim não couber no tamanho mínimo, reporta o excesso.
 */
export function FitBox({
  children,
  max,
  min,
  className,
  style,
  id,
  label,
  lineHeight,
}: {
  children: ReactNode
  max: number
  min: number
  className?: string
  style?: CSSProperties
  id: string
  label: string
  lineHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const report = useContext(OverflowContext)

  const fit = () => {
    const el = ref.current
    if (!el) return
    let size = max
    el.style.fontSize = `${size}px`
    while (el.scrollHeight > el.clientHeight + 1 && size > min) {
      size -= 1
      el.style.fontSize = `${size}px`
    }
    const over = el.scrollHeight > el.clientHeight + 1
    el.dataset.overflow = over ? 'true' : 'false'
    report?.(id, over, label)
  }

  useLayoutEffect(fit)
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => alive && fit())
    return () => {
      alive = false
      report?.(id, false, label)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={ref} className={cn('overflow-hidden', className)} style={{ ...style, fontSize: max, lineHeight }}>
      {children}
    </div>
  )
}

export function RichHtml({ html, className }: { html: string; className?: string }) {
  return <div className={cn('rich', className)} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
}

/** Texto com *trechos* destacados na cor da marca. */
export function Highlight({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') ? (
          <span key={i} className={cn('text-brand', className)}>
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

export const stripMarks = (s: string) => s.replace(/\*/g, '')

/* ------------------------------------------------------------------------- */

/** Logo Cibus: o enviado nas configurações ou o oficial (versão escura em fundo claro, branca em fundo escuro). */
export function CibusLogo({ src, dark, height = 30, showProduct = true }: { src?: string; dark?: boolean; height?: number; showProduct?: boolean }) {
  const theme = useContext(SlideThemeContext)
  const logo = src ? (
    <img src={src} alt="Cibus" style={{ height }} className="w-auto object-contain" />
  ) : (
    <img src={dark ? logoWhite : logoInk} alt="Cibus" style={{ height: Math.round(height * 0.9) }} className="w-auto" />
  )
  if (!showProduct || theme?.productKey !== 'partner') return logo
  return (
    <div className="flex items-center" style={{ gap: height * 0.3 }}>
      {logo}
      <span
        className="rounded-full bg-brand font-extrabold uppercase text-white"
        style={{ fontSize: Math.max(8, height * 0.36), padding: `${height * 0.1}px ${height * 0.28}px`, letterSpacing: '0.14em' }}
      >
        Partner
      </span>
    </div>
  )
}

/**
 * Marca d'água da Cibus: o cifrão do logo ou o logo inteiro, em baixa opacidade.
 * `tone="dark"` escurece a marca para uso sobre fundos claros.
 */
export function BrandWatermark({
  variant = 'cifrao',
  tone = 'light',
  opacity = 0.08,
  className,
  style,
}: {
  variant?: 'cifrao' | 'logo'
  tone?: 'light' | 'dark'
  opacity?: number
  className?: string
  style?: CSSProperties
}) {
  const src = variant === 'logo' ? (tone === 'dark' ? logoInk : logoWhite) : cifraoWhite
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={cn('pointer-events-none absolute max-w-none select-none', className)}
      style={{ opacity, filter: tone === 'dark' && variant === 'cifrao' ? 'brightness(0)' : undefined, ...style }}
    />
  )
}

export function Slide({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const theme = useContext(SlideThemeContext)
  return (
    <div
      className={cn('relative overflow-hidden font-sans text-ink antialiased', className)}
      style={{ width: SLIDE_W, height: SLIDE_H, ...(theme?.vars as CSSProperties), ...style }}
      data-slide
    >
      {children}
    </div>
  )
}

export function SlideHeader({
  index,
  kicker,
  title,
  subtitle,
  dark,
}: {
  index: number
  kicker: string
  title: string
  subtitle?: string
  dark?: boolean
}) {
  return (
    <div className="absolute left-[72px] right-[72px] top-[52px]">
      <div className="flex items-center gap-3 text-[13px] font-bold uppercase tracking-[0.18em] text-brand">
        <span className="tabular-nums">{String(index).padStart(2, '0')}</span>
        <span className="h-[2px] w-7 rounded-full bg-brand" />
        <span>{kicker}</span>
      </div>
      <h2
        className={cn('mt-4 text-[44px] font-extrabold leading-[1.05]', dark ? 'text-white' : 'text-ink')}
        style={{ letterSpacing: '-0.035em' }}
      >
        <Highlight text={title} />
      </h2>
      {subtitle && <p className={cn('mt-2.5 text-[18px] font-medium', dark ? 'text-white/60' : 'text-slate-500')}>{subtitle}</p>}
    </div>
  )
}

export function SlideFooter({
  page,
  total,
  company,
  logo,
  dark,
  left = 72,
}: {
  page: number
  total: number
  company: string
  logo?: string
  dark?: boolean
  left?: number
}) {
  return (
    <div className="absolute bottom-[26px] right-[72px] flex items-center justify-between" style={{ left }}>
      <CibusLogo src={logo} dark={dark} height={18} />
      <div className={cn('flex items-center gap-4 text-[12px] font-semibold', dark ? 'text-white/45' : 'text-slate-400')}>
        <span>Proposta Comercial{company ? ` · ${company}` : ''}</span>
        <span className={cn('h-3 w-px', dark ? 'bg-white/20' : 'bg-slate-300')} />
        <span className="tabular-nums">
          {String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

/** Link clicável no app e anotado como link no PDF exportado. */
export function SlideLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const mode = useContext(SlideModeContext)
  if (!href) return <div className={className}>{children}</div>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-pdf-link={href}
      className={className}
      onClick={(e) => mode === 'export' && e.preventDefault()}
    >
      {children}
    </a>
  )
}
