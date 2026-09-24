import { AlertTriangle, ArrowLeft, Check, CloudOff, Eye, Loader2, PanelsTopLeft, ListChecks, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SaveState } from '@/hooks/use-proposal'
import type { OverflowItem } from '@/components/slides/frame'
import type { Proposal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/pages/dashboard'

export function SaveIndicator({ state }: { state: SaveState }) {
  const map: Record<SaveState, { icon: React.ReactNode; text: string; cls?: string }> = {
    idle: { icon: <Check className="h-3.5 w-3.5" />, text: 'Tudo salvo' },
    saved: { icon: <Check className="h-3.5 w-3.5" />, text: 'Salvo' },
    dirty: { icon: <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />, text: 'Alterações não salvas' },
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Salvando…' },
    error: { icon: <CloudOff className="h-3.5 w-3.5" />, text: 'Erro ao salvar', cls: 'text-red-600' },
  }
  const s = map[state]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground', s.cls)} aria-live="polite">
      {s.icon}
      {s.text}
    </span>
  )
}

export function ProposalTopBar({
  p,
  saveState,
  onSave,
  mode,
}: {
  p: Proposal
  saveState: SaveState
  onSave: () => void
  mode: 'wizard' | 'editor'
}) {
  return (
    <div className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar para propostas">
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-bold text-ink">{p.client.company || 'Nova proposta'}</h1>
            <StatusBadge status={p.status} />
          </div>
          <SaveIndicator state={saveState} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {mode === 'wizard' ? (
            <Button asChild variant="ghost" size="sm" className="max-md:hidden">
              <Link to={`/propostas/${p.id}/editor`}>
                <PanelsTopLeft /> Editor visual
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="max-md:hidden">
              <Link to={`/propostas/${p.id}?step=review`}>
                <ListChecks /> Assistente
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={`/propostas/${p.id}/apresentar`}>
              <Eye /> <span className="max-sm:hidden">Visualizar proposta</span>
            </Link>
          </Button>
          <Button size="sm" variant="dark" onClick={onSave} disabled={saveState === 'saving'}>
            <Save /> <span className="max-sm:hidden">Salvar rascunho</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function OverflowWarnings({ items, className }: { items: OverflowItem[]; className?: string }) {
  if (!items.length) return null
  return (
    <div className={cn('rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800', className)}>
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" /> Conteúdo acima do espaço recomendado
      </div>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-6 text-[13px]">
        {items.map((i) => (
          <li key={`${i.slideId}:${i.id}`}>
            <span className="font-semibold">{i.label}</span> — reduzimos a fonte ao mínimo e ainda não coube. Encurte o texto.
          </li>
        ))}
      </ul>
    </div>
  )
}
