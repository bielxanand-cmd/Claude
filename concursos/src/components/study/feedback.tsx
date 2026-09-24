import { AlertTriangle, FlaskConical, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-border-strong/70 px-6 py-12 text-center', className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-tint text-primary dark:text-primary-soft">
        <Icon className="size-7" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-danger/30 bg-danger-tint px-6 py-10 text-center">
      <AlertTriangle className="size-8 text-danger" aria-hidden />
      <h3 className="mt-3 font-bold">Não foi possível carregar os dados</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{error instanceof Error ? error.message : 'Erro inesperado.'}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

/** Selo que sinaliza dados demonstrativos (não oficiais). */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Os editais usados aqui são demonstrativos e não correspondem a editais oficiais."
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning-tint px-2.5 py-0.5 text-xs font-semibold text-[#b45309] dark:text-warning',
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      Dados demonstrativos
    </span>
  )
}

export function DemoNotice({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-tint p-4 text-sm', className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-[#b45309] dark:text-warning" aria-hidden />
      <p className="text-foreground/80">
        <strong className="font-semibold text-foreground">Dados demonstrativos.</strong> As disciplinas e assuntos deste cargo foram
        consolidados a partir de editais ilustrativos, até que uma base oficial seja cadastrada. Você pode importar um edital real em{' '}
        <em>Meu concurso</em>.
      </p>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  )
}
