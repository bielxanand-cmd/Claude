import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-extrabold tracking-tight', className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-primary-strong text-white shadow-[0_4px_14px_-4px_rgb(124_58_237/0.7)]">
        <Check className="size-[18px]" strokeWidth={3.2} aria-hidden />
      </span>
      <span className={cn('text-[17px]', light ? 'text-white' : 'text-foreground')}>
        Aprova<span className="text-primary-soft">.</span>
      </span>
    </span>
  )
}
