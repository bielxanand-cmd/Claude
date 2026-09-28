import { useState } from 'react'
import { KeyRound, Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Field } from '@/components/forms/fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { changePassword, MIN_PASSWORD, signOut, useAccount } from '@/lib/auth'
import { initials } from '@/lib/utils'

/** Conta conectada no cabeçalho: trocar senha e sair. */
export function AccountMenu() {
  const account = useAccount()
  const [open, setOpen] = useState(false)
  if (!account) return null
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-9 max-w-[200px] items-center gap-2 rounded-full border px-2 pr-3 text-sm font-semibold transition-colors hover:bg-ink/5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">{initials(account.name)}</span>
            <span className="hidden truncate md:inline">{account.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2.5 py-2">
            <div className="truncate text-sm font-bold text-ink">{account.name}</div>
            <div className="truncate text-xs text-muted-foreground">{account.email}</div>
            {account.role === 'admin' && <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-brand">Administrador</div>}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <KeyRound /> Alterar senha
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={signOut}>
            <LogOut /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const close = (o: boolean) => {
    if (!o) {
      setCurrent('')
      setNext('')
      setConfirm('')
      setError('')
    }
    onOpenChange(o)
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            if (next !== confirm) return setError('As senhas não conferem.')
            setBusy(true)
            try {
              await changePassword(current, next)
              toast.success('Senha alterada')
              close(false)
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>Mínimo de {MIN_PASSWORD} caracteres.</DialogDescription>
          </DialogHeader>
          <Field label="Senha atual" htmlFor="cp-cur">
            <Input id="cp-cur" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="Nova senha" htmlFor="cp-new">
            <Input id="cp-new" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirmar nova senha" htmlFor="cp-new2">
            <Input id="cp-new2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <DialogFooter>
            <Button disabled={busy}>{busy && <Loader2 className="animate-spin" />} Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
