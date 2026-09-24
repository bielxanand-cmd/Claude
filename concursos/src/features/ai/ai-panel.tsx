import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AI_ACTIONS, type AiActionId } from './actions'

/**
 * Painel de ações do assistente. Ações sem `available` aparecem como
 * "em breve" até que um provedor de IA seja configurado.
 */
export function AiPanel({ onAction }: { onAction?: Partial<Record<AiActionId, () => void>> }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary-tint to-transparent px-5 py-4">
        <Sparkles className="size-4 text-primary dark:text-primary-soft" aria-hidden />
        <h2 className="text-sm font-bold">Assistente de estudos</h2>
      </div>
      <ul className="grid grid-cols-1 gap-1 p-2">
        {AI_ACTIONS.map(({ id, label, description, icon: Icon, available: ready }) => {
          const available = ready && !!onAction?.[id]
          return (
          <li key={id}>
            <button
              type="button"
              onClick={onAction?.[id]}
              disabled={!available}
              title={available ? description : `${description} (em breve)`}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition enabled:hover:bg-primary-tint disabled:cursor-not-allowed"
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg',
                  available ? 'bg-primary-tint text-primary dark:text-primary-soft' : 'bg-foreground/[0.05] text-muted',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={cn('flex items-center gap-2 text-sm font-semibold', available ? 'text-foreground' : 'text-foreground/70')}>
                  ✨ {label}
                  {!available && <span className="rounded-full bg-foreground/[0.06] px-1.5 py-px text-[10px] font-semibold text-muted">em breve</span>}
                </span>
                <span className="block truncate text-xs text-subtle">{description}</span>
              </span>
            </button>
          </li>
          )
        })}
      </ul>
    </Card>
  )
}
