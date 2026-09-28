import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { Field } from '@/components/forms/fields'
import { CibusLogo } from '@/components/slides/primitives'
import { Loading } from '@/components/status-pages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppData } from '@/lib/app-data'
import { changePassword, MIN_PASSWORD, restoreSession, signIn, signOut, signUp, useAccount } from '@/lib/auth'
import { supabase } from '@/lib/repo'
import { cn } from '@/lib/utils'
import { AuthLayout } from '@/pages/login'

const NEW_EXEC = '__new__'

/**
 * Sem Supabase, o app só abre com uma conta (e-mail e senha) conectada.
 * Também não abre se o banco da equipe não conectar, para nada ser salvo
 * em outro lugar sem aviso.
 */
export function AccountGate({ children }: { children: ReactNode }) {
  const { ready, error } = useAppData()
  const account = useAccount()
  const [restored, setRestored] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const navigate = useNavigate()
  const lastAccount = useRef<string | null>(null)

  // ao sair, a próxima pessoa começa na tela inicial (e não na página de quem saiu)
  useEffect(() => {
    if (lastAccount.current && lastAccount.current !== account?.id) navigate('/', { replace: true })
    lastAccount.current = account?.id ?? null
  }, [account?.id, navigate])

  useEffect(() => {
    if (supabase || !ready || error) return
    restoreSession().then(
      () => setRestored(true),
      (e) => setRestoreError(e instanceof Error ? e.message : String(e)),
    )
  }, [ready, error])

  if (supabase) return <>{children}</>
  if (!ready) return <Loading />
  if (error || restoreError) return <ConnectionError message={error ?? restoreError!} />
  if (!restored) return <Loading />
  if (!account) return <AccountLogin />
  if (account.mustChangePassword) return <ForcedPasswordChange />
  return <>{children}</>
}

function ConnectionError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="h-8 w-8 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-extrabold text-ink">{message}</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Para nada ser perdido, o Cibus Propostas só abre conectado ao banco da equipe. Verifique a internet e se você tem acesso a este link.
        </p>
      </div>
      <Button onClick={() => window.location.reload()}>
        <RefreshCw /> Tentar de novo
      </Button>
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} required value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-ink"
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function AccountLogin() {
  const { executives, reload } = useAppData()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [executiveId, setExecutiveId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const active = executives.filter((e) => e.active)

  // sugere o executivo com o mesmo nome digitado
  useEffect(() => {
    if (mode !== 'signup' || executiveId) return
    const match = active.find((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (match) setExecutiveId(match.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, mode])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'signup' && password !== confirm) return setError('As senhas não conferem.')
    setBusy(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else {
        const creates = !executiveId || executiveId === NEW_EXEC
        // o executivo novo precisa estar na lista antes da primeira proposta
        await signUp({ name, email, password, executiveId: creates ? null : executiveId }, executives, creates ? reload : undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <form className="w-full max-w-sm space-y-5" onSubmit={submit}>
        <div className="lg:hidden">
          <CibusLogo height={28} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' ? 'Acesse suas propostas com seu e-mail e senha.' : 'Cada pessoa da equipe tem o seu login. Suas propostas ficam salvas na sua conta.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError('')
              }}
              className={cn('rounded-md py-1.5 text-sm font-semibold transition-colors', mode === m ? 'bg-white text-ink shadow-sm' : 'text-muted-foreground hover:text-ink')}
            >
              {m === 'signin' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>
        {mode === 'signup' && (
          <Field label="Nome completo" htmlFor="acc-name">
            <Input id="acc-name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label="E-mail" htmlFor="acc-email">
          <Input id="acc-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha" htmlFor="acc-pass" hint={mode === 'signup' ? `Mínimo de ${MIN_PASSWORD} caracteres.` : undefined}>
          <PasswordInput id="acc-pass" value={password} onChange={setPassword} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
        </Field>
        {mode === 'signup' && (
          <>
            <Field label="Confirmar senha" htmlFor="acc-pass2">
              <PasswordInput id="acc-pass2" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </Field>
            <Field label="Você é qual executivo?" hint="Aparece na capa e no encerramento das propostas que você criar.">
              <Select value={executiveId} onValueChange={setExecutiveId}>
                <SelectTrigger aria-label="Executivo">
                  <SelectValue placeholder="Escolha seu nome" />
                </SelectTrigger>
                <SelectContent>
                  {active.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_EXEC}>Não estou na lista (criar com meu nome)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button className="w-full" size="lg" disabled={busy || (mode === 'signup' && !executiveId)}>
          {busy && <Loader2 className="animate-spin" />} {mode === 'signin' ? 'Entrar' : 'Criar conta e entrar'}
        </Button>
        {mode === 'signin' && (
          <p className="text-center text-xs text-muted-foreground">Esqueceu a senha? Peça a um administrador para redefinir em Configurações › Usuários.</p>
        )}
      </form>
    </AuthLayout>
  )
}

/** Depois de uma senha provisória, a pessoa escolhe a própria. */
function ForcedPasswordChange() {
  const account = useAccount()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <AuthLayout>
      <form
        className="w-full max-w-sm space-y-5"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          if (password !== confirm) return setError('As senhas não conferem.')
          setBusy(true)
          try {
            await changePassword(null, password)
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
            setBusy(false)
          }
        }}
      >
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">Crie sua nova senha</h2>
          <p className="text-sm text-muted-foreground">
            Olá, {account?.name}. Você entrou com uma senha provisória; escolha uma senha só sua para continuar.
          </p>
        </div>
        <Field label="Nova senha" htmlFor="np1" hint={`Mínimo de ${MIN_PASSWORD} caracteres.`}>
          <PasswordInput id="np1" value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label="Confirmar nova senha" htmlFor="np2">
          <PasswordInput id="np2" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button className="w-full" size="lg" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Salvar senha e continuar
        </Button>
        <button type="button" onClick={signOut} className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-ink">
          Sair
        </button>
      </form>
    </AuthLayout>
  )
}
