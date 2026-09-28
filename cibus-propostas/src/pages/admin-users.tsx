import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Section } from '@/components/forms/fields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppData } from '@/lib/app-data'
import { listAccounts, resetPassword, updateAccount, useAccount } from '@/lib/auth'
import type { SessionAccount } from '@/lib/session'
import { cn, initials } from '@/lib/utils'

const NONE = '__none__'

/** Contas de acesso. Todos veem a lista; só administradores alteram. */
export function UsersAdmin() {
  const me = useAccount()
  const { executives } = useAppData()
  const [accounts, setAccounts] = useState<SessionAccount[] | null>(null)
  const [temp, setTemp] = useState<{ name: string; email: string; password: string } | null>(null)
  const isAdmin = me?.role === 'admin'

  const load = useCallback(() => listAccounts().then(setAccounts, (e) => toast.error(e.message)), [])
  useEffect(() => {
    load()
  }, [load])

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      toast.success(ok)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Section
      title="Usuários"
      description={
        isAdmin
          ? 'Cada pessoa cria o próprio login na tela de entrada. Aqui você redefine senhas, muda o executivo vinculado e ativa ou desativa contas.'
          : 'Contas com acesso ao Cibus Propostas. Só administradores podem alterá-las.'
      }
    >
      <div className="overflow-hidden rounded-xl border bg-white">
        {(accounts ?? []).map((a) => (
          <div key={a.id} className={cn('flex flex-wrap items-center gap-4 border-b p-4 last:border-b-0', !a.active && 'opacity-60')}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{initials(a.name)}</div>
            <div className="min-w-[180px] flex-1">
              <div className="flex items-center gap-2 font-bold text-ink">
                {a.name}
                {a.id === me?.id && <span className="text-xs font-medium text-muted-foreground">(você)</span>}
                {a.role === 'admin' && <Badge variant="outline">Administrador</Badge>}
                {!a.active && <Badge variant="outline">Desativada</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">{a.email}</div>
              <div className="text-xs text-muted-foreground">
                {a.lastLoginAt ? `Último acesso em ${new Date(a.lastLoginAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Nunca entrou'}
              </div>
            </div>
            <div className="w-56">
              <Select
                value={a.executiveId ?? NONE}
                disabled={!isAdmin && a.id !== me?.id}
                onValueChange={(v) => run(() => updateAccount(a.id, { executiveId: v === NONE ? null : v }), 'Executivo atualizado')}
              >
                <SelectTrigger aria-label={`Executivo de ${a.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem executivo</SelectItem>
                  {executives.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Redefinir senha"
                  aria-label={`Redefinir senha de ${a.name}`}
                  onClick={async () => {
                    try {
                      setTemp({ name: a.name, email: a.email, password: await resetPassword(a.id) })
                    } catch (e) {
                      toast.error((e as Error).message)
                    }
                  }}
                >
                  <KeyRound />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={a.role === 'admin' ? 'Tirar de administrador' : 'Tornar administrador'}
                  aria-label={a.role === 'admin' ? `Tirar ${a.name} de administrador` : `Tornar ${a.name} administrador`}
                  onClick={() => run(() => updateAccount(a.id, { role: a.role === 'admin' ? 'member' : 'admin' }), 'Permissão atualizada')}
                >
                  <ShieldCheck className={a.role === 'admin' ? 'text-brand' : undefined} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={a.active ? 'Desativar conta' : 'Reativar conta'}
                  aria-label={a.active ? `Desativar ${a.name}` : `Reativar ${a.name}`}
                  disabled={a.id === me?.id}
                  onClick={() => run(() => updateAccount(a.id, { active: !a.active }), a.active ? 'Conta desativada' : 'Conta reativada')}
                >
                  {a.active ? <UserX /> : <UserCheck />}
                </Button>
              </div>
            )}
          </div>
        ))}
        {accounts?.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhuma conta ainda.</div>}
      </div>

      <Dialog open={!!temp} onOpenChange={(o) => !o && setTemp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha provisória de {temp?.name}</DialogTitle>
            <DialogDescription>
              Envie para {temp?.email}. No próximo acesso, a pessoa entra com ela e cria uma senha nova. Esta senha não aparece de novo.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-mist px-4 py-3 text-center font-mono text-lg font-bold tracking-wide text-ink">{temp?.password}</div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(temp!.password).then(
                  () => toast.success('Senha copiada'),
                  () => toast.error('Não foi possível copiar'),
                )
              }}
            >
              <Copy /> Copiar
            </Button>
            <Button onClick={() => setTemp(null)}>Pronto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}
