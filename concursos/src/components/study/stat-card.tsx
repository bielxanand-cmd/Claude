import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  children,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon: LucideIcon
  tone?: 'primary' | 'success' | 'dark' | 'warning'
  children?: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        <span
          className={cn(
            'grid size-8 place-items-center rounded-lg',
            tone === 'primary' && 'bg-primary-tint text-primary dark:text-primary-soft',
            tone === 'success' && 'bg-success-tint text-success-strong',
            tone === 'dark' && 'bg-foreground text-background',
            tone === 'warning' && 'bg-warning-tint text-[#b45309] dark:text-warning',
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-[28px] font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-[13px] text-muted">{hint}</p>}
      {children}
    </Card>
  )
}
