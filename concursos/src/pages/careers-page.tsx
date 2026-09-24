import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/study/feedback'
import { IconTile } from '@/components/study/icon-registry'
import { PageHeader } from '@/components/study/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCareers, usePositions } from '@/data/queries'
import { pluralize } from '@/lib/text'

export function CareersPage() {
  const careers = useCareers()
  const positions = usePositions({})
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of positions.data ?? []) map.set(p.career.id, (map.get(p.career.id) ?? 0) + 1)
    return map
  }, [positions.data])

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Explorar" title="Carreiras" description="Escolha uma carreira para ver os cargos e os editais disponíveis." />
      {careers.error ? (
        <ErrorState error={careers.error} onRetry={() => careers.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {careers.isLoading
            ? Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-32" />)
            : careers.data?.map((career) => (
                <Link key={career.id} to={`/cargos?carreira=${career.id}`} className="group block rounded-2xl">
                  <Card interactive className="flex h-full items-start gap-4 p-5">
                    <IconTile icon={career.icon} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold">{career.name}</h2>
                      <p className="mt-0.5 text-sm text-muted">{career.description}</p>
                      <p className="mt-3 text-xs font-semibold text-primary dark:text-primary-soft">
                        {counts.get(career.id) ? pluralize(counts.get(career.id)!, 'cargo', 'cargos') : 'Nenhum cargo cadastrado'}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                  </Card>
                </Link>
              ))}
        </div>
      )}
    </div>
  )
}
