import { Cloud, CloudOff, Database, Download, HardDrive, Monitor, Moon, RotateCcw, Sun, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/study/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { useProfile, useResetData, useSelection, useSummaries, useUpdateProfile, useUserTopics } from '@/data/queries'
import { useSyncStatus } from '@/data/persistence/status'
import { dataSource } from '@/data/sources'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

export function SettingsPage() {
  const profile = useProfile()
  const updateProfile = useUpdateProfile()
  const selection = useSelection()
  const userTopics = useUserTopics()
  const summaries = useSummaries()
  const reset = useResetData()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const sync = useSyncStatus()
  const [nameDraft, setName] = useState<string | null>(null)
  const name = nameDraft ?? profile.data?.name ?? ''
  const [confirmReset, setConfirmReset] = useState(false)

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate({ name: name.trim() }, { onSuccess: () => {
      setName(null)
      toast.success('Perfil atualizado')
    } })
  }

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), profile: profile.data, selection: selection.data, topics: userTopics.data, summaries: summaries.data }, null, 2)],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `aprova-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Configurações" title="Preferências" />
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-primary" /> Perfil
              </CardTitle>
              <CardDescription>Como devemos chamar você?</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="given-name" />
              </div>
              <Button type="submit" loading={updateProfile.isPending} disabled={name.trim() === (profile.data?.name ?? '')}>
                Salvar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Escolha o tema da interface.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-3">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-semibold transition',
                    theme === value ? 'border-primary bg-primary-tint text-primary-strong ring-4 ring-ring/15 dark:text-primary-soft' : 'border-border hover:border-border-strong',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-primary" /> Dados
              </CardTitle>
              <CardDescription>
                {dataSource.kind === 'supabase'
                  ? 'Seus dados estão sincronizados com o Supabase.'
                  : sync.where === 'cloud'
                    ? 'Seus concursos, progresso, resumos e editais importados ficam salvos na sua conta do Claude e aparecem em qualquer navegador ou dispositivo em que você abrir esta página.'
                    : 'Seus dados ficam salvos neste navegador. Limpar os dados do navegador apaga o progresso.'}
                {sync.where !== 'loading' && dataSource.kind !== 'supabase' && (
                  <span
                    className={cn(
                      'mt-3 flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                      sync.state === 'error' ? 'bg-danger-tint text-danger' : 'bg-success-tint text-success-strong',
                    )}
                  >
                    {sync.state === 'error' ? <CloudOff className="size-3.5" /> : sync.where === 'cloud' ? <Cloud className="size-3.5" /> : <HardDrive className="size-3.5" />}
                    {sync.state === 'error'
                      ? 'Falha ao salvar'
                      : sync.state === 'saving'
                        ? 'Salvando…'
                        : sync.where === 'cloud'
                          ? 'Salvo na sua conta'
                          : 'Salvo neste navegador'}
                  </span>
                )}
                {sync.message && <span className="mt-2 block text-xs text-danger">{sync.message}</span>}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            {/* A versão de demonstração publicada não pode oferecer downloads */}
            {import.meta.env.VITE_MEMORY_ROUTER !== 'true' && (
              <Button variant="outline" onClick={exportData}>
                <Download /> Exportar meus dados
              </Button>
            )}
            <Button variant="ghost" className="text-danger hover:bg-danger-tint hover:text-danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw /> Apagar progresso e resumos
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-subtle">Aprova · versão 1.0 · {dataSource.kind === 'supabase' ? 'Supabase' : sync.where === 'cloud' ? 'conta do Claude' : 'neste navegador'}</p>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="max-w-md">
          <DialogTitle>Apagar todos os seus dados?</DialogTitle>
          <DialogDescription>Progresso, resumos, cargo selecionado e editais importados serão removidos. Essa ação não pode ser desfeita.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={reset.isPending}
              onClick={() =>
                reset.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmReset(false)
                    toast('Dados apagados')
                    navigate('/')
                  },
                })
              }
            >
              Apagar tudo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
