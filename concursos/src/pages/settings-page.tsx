import { Database, Download, Monitor, Moon, RotateCcw, Sun, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/study/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { useProfile, useResetData, useSelection, useSummaries, useUpdateProfile, useUserTopics } from '@/data/queries'
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
                  : 'Modo local: seus dados ficam salvos neste navegador. Configure o Supabase para sincronizar entre dispositivos.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={exportData}>
              <Download /> Exportar meus dados
            </Button>
            <Button variant="ghost" className="text-danger hover:bg-danger-tint hover:text-danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw /> Apagar progresso e resumos
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-subtle">Aprova · versão 1.0 · {dataSource.kind === 'supabase' ? 'Supabase' : 'modo local'}</p>
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
