import { NavLink, Link } from 'react-router-dom'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useStudy } from '@/data/queries'
import { planProgress } from '@/domain/progress'
import { percent } from '@/lib/text'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { SyncIndicator } from './sync-indicator'
import { NAV_ITEMS } from './nav'

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { plan, statuses } = useStudy()
  const progress = plan ? planProgress(plan, statuses) : null

  return (
    <div className="flex h-full flex-col bg-sidebar px-3 py-5 text-sidebar-foreground">
      <Link to="/dashboard" onClick={onNavigate} className="mb-8 px-3" aria-label="Aprova — início">
        <Logo light />
      </Link>

      <nav aria-label="Navegação principal" className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors',
                'hover:bg-white/[0.05] hover:text-white',
                isActive && 'bg-white/[0.08] text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-soft transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                />
                <Icon className={cn('size-[18px] transition-colors', isActive ? 'text-primary-soft' : 'group-hover:text-white')} aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <SyncIndicator className="mb-3 mt-6 px-3" />
      {plan && progress && (
        <Link
          to="/progresso"
          onClick={onNavigate}
          className="block rounded-2xl border border-sidebar-border bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
        >
          <p className="text-xs font-medium text-sidebar-muted">Progresso geral</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{percent(progress.ratio)}</p>
          <ProgressBar value={progress.ratio} size="sm" className="mt-3 bg-white/10" label="Progresso geral" />
          <p className="mt-2 text-xs text-sidebar-muted">
            {progress.completed} de {progress.total} assuntos
          </p>
        </Link>
      )}
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-sidebar-border lg:block">
      <SidebarContent />
    </aside>
  )
}
