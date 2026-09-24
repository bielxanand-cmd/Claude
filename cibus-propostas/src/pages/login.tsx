import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/forms/fields'
import { CibusLogo } from '@/components/slides/primitives'
import { supabase } from '@/lib/repo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full border-[50px] border-brand/10" />
        <CibusLogo dark height={34} />
        <div className="mt-auto max-w-md">
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-[-0.04em]">
            Propostas que <span className="text-brand">vendem</span>, em poucos minutos.
          </h1>
          <p className="mt-4 text-white/60">Preencha, escolha módulos e cases — o design fica por nossa conta.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form
          className="w-full max-w-sm space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            const { error } = await supabase!.auth.signInWithPassword({ email, password })
            if (error) setError('E-mail ou senha inválidos.')
            setBusy(false)
          }}
        >
          <div className="lg:hidden">
            <CibusLogo height={28} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Entrar</h2>
            <p className="text-sm text-muted-foreground">Acesse o Cibus Propostas com sua conta.</p>
          </div>
          <Field label="E-mail" htmlFor="login-email">
            <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha" htmlFor="login-pass">
            <Input id="login-pass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <Button className="w-full" size="lg" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
