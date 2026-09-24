import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { AI_ACTIONS } from './actions'

/** Painel de ações de IA (desativadas até que um provedor seja configurado). */
export function AiPanel() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary-tint to-transparent px-5 py-4">
        <Sparkles className="size-4 text-primary dark:text-primary-soft" aria-hidden />
        <h2 className="text-sm font-bold">Assistente de estudos</h2>
        <span className="ml-auto whitespace-nowrap rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-semibold text-muted">Em breve</span>
      </div>
      <ul className="grid grid-cols-1 gap-1 p-2">
        {AI_ACTIONS.map(({ id, label, description, icon: Icon, available }) => (
          <li key={id}>
            <button
              type="button"
              disabled={!available}
              title={available ? description : `${description} (em breve)`}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition enabled:hover:bg-primary-tint disabled:cursor-not-allowed"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground/[0.05] text-muted">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground/70">✨ {label}</span>
                <span className="block truncate text-xs text-subtle">{description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
