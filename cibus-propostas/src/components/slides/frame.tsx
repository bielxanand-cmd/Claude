import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { OverflowContext, SLIDE_H, SLIDE_W } from './primitives'

/** Mostra um slide 1280×720 escalado para a largura disponível. */
export function SlideFrame({ children, className, rounded = true }: { children: ReactNode; className?: string; rounded?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / SLIDE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={cn('relative w-full overflow-hidden bg-white', rounded && 'rounded-lg', className)}
      style={{ aspectRatio: `${SLIDE_W} / ${SLIDE_H}` }}
    >
      {scale > 0 && (
        <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      )}
    </div>
  )
}

/** Mostra um slide encaixado (contain) em uma área de largura e altura livres. */
export function SlideFit({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const cs = getComputedStyle(el)
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      setScale(Math.max(0.05, Math.min(w / SLIDE_W, h / SLIDE_H)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className={cn('flex items-center justify-center overflow-hidden', className)}>
      {scale > 0 && (
        <div style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }} className="overflow-hidden rounded-md shadow-2xl">
          <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
        </div>
      )}
    </div>
  )
}

export interface OverflowItem {
  id: string
  label: string
  slideId: string
}

/** Coleta avisos de conteúdo que não coube nos slides renderizados dentro dele. */
export function useOverflowCollector() {
  const [items, setItems] = useState<Record<string, OverflowItem>>({})
  const makeReporter = useCallback(
    (slideId: string) => (id: string, over: boolean, label: string) => {
      const key = `${slideId}:${id}`
      setItems((prev) => {
        if (over === !!prev[key]) return prev
        const next = { ...prev }
        if (over) next[key] = { id, label, slideId }
        else delete next[key]
        return next
      })
    },
    [],
  )
  const list = useMemo(() => Object.values(items), [items])
  return { overflow: list, makeReporter }
}

export function OverflowScope({ report, children }: { report: (id: string, over: boolean, label: string) => void; children: ReactNode }) {
  return <OverflowContext.Provider value={report}>{children}</OverflowContext.Provider>
}
