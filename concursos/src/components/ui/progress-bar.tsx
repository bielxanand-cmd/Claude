import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  /** 0–1 */
  value: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'auto' | 'primary' | 'success'
  label?: string
}

/** Barra de progresso animada (anima também na montagem). */
export function ProgressBar({ value, className, size = 'md', tone = 'auto', label }: ProgressBarProps) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, value))))
    return () => cancelAnimationFrame(id)
  }, [value])

  const complete = value >= 1
  const color = tone === 'success' || (tone === 'auto' && complete) ? 'bg-success' : 'bg-gradient-to-r from-primary to-primary-soft'

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cn('w-full overflow-hidden rounded-full bg-foreground/[0.07]', size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-3', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', color)} style={{ width: `${shown * 100}%` }} />
    </div>
  )
}
