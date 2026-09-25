import { Check, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useIdentity } from '@/hooks/use-people'
import { useAppData } from '@/lib/app-data'
import { repo } from '@/lib/repo'
import { uid } from '@/lib/templates'
import { cn, initials } from '@/lib/utils'

const NEW = '__new__'

/**
 * "Quem é você?" no link compartilhado. Aparece sozinho enquanto a pessoa não
 * se identificou e pode ser reaberto pelo botão com o nome no cabeçalho.
 */
export function IdentityButton() {
  const { loaded, supported, identity, save } = useIdentity()
  const { executives, reload } = useAppData()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<string>('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const missing = loaded && supported && !identity
  useEffect(() => {
    if (missing) setOpen(true)
  }, [missing])
  useEffect(() => {
    if (open) {
      setChoice(identity?.executiveId ?? '')
      setNewName('')
    }
  }, [open, identity])

  if (!loaded || !supported) return null

  const active = executives.filter((e) => e.active)
  const submit = async () => {
    setSaving(true)
    try {
      if (choice === NEW) {
        const name = newName.trim()
        const exec = { id: uid(), name, email: '', phone: '', whatsapp: '', role: 'Executivo de Contas', photo: '', active: true }
        await repo.saveExecutive(exec)
        await save({ executiveId: exec.id, name })
        await reload()
      } else {
        const exec = executives.find((e) => e.id === choice)!
        await save({ executiveId: exec.id, name: exec.name })
      }
      setOpen(false)
      toast.success('Identificação salva', { description: 'Suas propostas passam a aparecer com o seu nome.' })
    } catch (e) {
      toast.error('Não foi possível salvar', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }
  const canSubmit = choice === NEW ? newName.trim().length > 1 : !!choice

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-9 max-w-[180px] items-center gap-2 rounded-full border px-2 pr-3 text-sm font-semibold transition-colors hover:bg-ink/5',
          !identity && 'border-brand text-brand',
        )}
        title="Quem é você?"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
          {identity ? initials(identity.name) : <UserRound className="h-3.5 w-3.5" />}
        </span>
        <span className="hidden truncate md:inline">{identity ? identity.name : 'Identifique-se'}</span>
      </button>

      <Dialog open={open} onOpenChange={(o) => (identity || !o ? setOpen(o) : setOpen(true))}>
        <DialogContent onInteractOutside={(e) => !identity && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Quem é você?</DialogTitle>
            <DialogDescription>
              Escolha o seu nome. Ele aparece como autor das propostas que você criar ou alterar, e você fica como executivo responsável das
              propostas novas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {active.map((e) => (
              <button
                key={e.id}
                onClick={() => setChoice(e.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-ink/40',
                  choice === e.id && 'border-brand bg-brand/5',
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/10 text-xs font-bold text-ink/70">
                  {initials(e.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.role}</span>
                </span>
                {choice === e.id && <Check className="h-4 w-4 text-brand" />}
              </button>
            ))}
            <button
              onClick={() => setChoice(NEW)}
              className={cn(
                'rounded-lg border border-dashed px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:border-ink/40',
                choice === NEW && 'border-solid border-brand bg-brand/5',
              )}
            >
              Não estou na lista
            </button>
            {choice === NEW && (
              <Input autoFocus placeholder="Seu nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} />
            )}
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!canSubmit || saving}>
              {saving ? 'Salvando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
