import { FileUp, ListTree } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { useImportNotice } from '@/data/queries'
import { parseNoticeSyllabus } from '@/domain/notice-parser'
import type { Sphere } from '@/domain/types'
import { BRAZIL_STATES, SPHERE_LABEL } from '@/lib/states'
import { cn } from '@/lib/utils'

const EXAMPLE = `LÍNGUA PORTUGUESA (peso 1, 10 questões): 1. Compreensão e interpretação de textos. 2. Crase. 3. Pontuação.
DIREITO TRIBUTÁRIO (peso 2): 1. Competência tributária. 2. Crédito tributário: constituição e lançamento. 3. Extinção do crédito tributário.`

/**
 * Importação de edital por texto (conteúdo programático). O mesmo fluxo
 * servirá para PDF: basta extrair o texto e reutilizar `parseNoticeSyllabus`.
 */
export function ImportNoticeDialog({
  open,
  onOpenChange,
  positionId,
  defaultSphere,
  defaultState,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  positionId: string
  defaultSphere: Sphere
  defaultState: string | null
}) {
  const [orgShort, setOrgShort] = useState('')
  const [organization, setOrganization] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [sphere, setSphere] = useState<Sphere>(defaultSphere)
  const [uf, setUf] = useState<string>(defaultState ?? '')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const importNotice = useImportNotice()

  const parsed = useMemo(() => parseNoticeSyllabus(text), [text])
  const topicCount = parsed.reduce((n, s) => n + s.topics.length, 0)
  const valid = orgShort.trim().length > 0 && parsed.length > 0 && topicCount > 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    importNotice.mutate(
      {
        positionId,
        contest: {
          name: `Concurso ${orgShort.trim()}`,
          organization: organization.trim() || orgShort.trim(),
          organizationShort: orgShort.trim(),
          sphere,
          state: sphere === 'federal' ? null : uf || null,
          city: null,
          year: year ? Number(year) : null,
          examBoard: null,
          noticeUrl: url.trim() || null,
          noticeDate: null,
          origin: 'import',
        },
        subjects: parsed,
      },
      {
        onSuccess: () => {
          toast.success('Edital importado!', { description: `${parsed.length} disciplinas e ${topicCount} assuntos adicionados ao seu plano.` })
          setText('')
          onOpenChange(false)
        },
        onError: (err) => toast.error('Falha ao importar', { description: err instanceof Error ? err.message : undefined }),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogTitle className="flex items-center gap-2">
          <FileUp className="size-5 text-primary" /> Importar edital
        </DialogTitle>
        <DialogDescription>
          Cole o conteúdo programático de um edital anterior. As disciplinas e os assuntos serão consolidados no seu plano com esta fonte registrada.
        </DialogDescription>

        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="org-short">Órgão (sigla)</Label>
                <Input id="org-short" value={orgShort} onChange={(e) => setOrgShort(e.target.value)} placeholder="Ex.: SEFAZ SP" required />
              </div>
              <div>
                <Label htmlFor="year">Ano</Label>
                <Input id="year" type="number" min={1980} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="org">Nome do órgão</Label>
              <Input id="org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Ex.: Secretaria da Fazenda de São Paulo" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Esfera</Label>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-foreground/[0.05] p-1">
                  {(Object.keys(SPHERE_LABEL) as Sphere[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={sphere === s}
                      onClick={() => setSphere(s)}
                      className={cn('h-9 rounded-lg text-xs font-semibold text-muted transition', sphere === s && 'bg-surface text-foreground shadow-soft')}
                    >
                      {SPHERE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              {sphere !== 'federal' && (
                <div>
                  <Label htmlFor="import-uf">Estado</Label>
                  <select
                    id="import-uf"
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm shadow-soft outline-none focus:border-primary"
                  >
                    <option value="">Selecione…</option>
                    {BRAZIL_STATES.map((s) => (
                      <option key={s.uf} value={s.uf}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="url">Link do edital (opcional)</Label>
              <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="syllabus" className="mb-0">
                  Conteúdo programático
                </Label>
                <button type="button" onClick={() => setText(EXAMPLE)} className="text-xs font-semibold text-primary hover:underline">
                  Ver exemplo
                </button>
              </div>
              <Textarea
                id="syllabus"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'DISCIPLINA: 1. Assunto. 2. Assunto.\n\nou\n\nDisciplina:\n- Assunto\n- Assunto'}
                className="min-h-48 font-mono text-[13px]"
                required
              />
            </div>
          </div>

          <div className="flex flex-col">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
              <ListTree className="size-4 text-primary" /> Pré-visualização
            </p>
            <div className="max-h-[420px] min-h-40 flex-1 overflow-y-auto rounded-xl border border-border bg-surface-2 p-3 text-sm">
              {parsed.length === 0 ? (
                <p className="p-2 text-muted">As disciplinas reconhecidas aparecem aqui enquanto você cola o texto.</p>
              ) : (
                <ul className="space-y-3">
                  {parsed.map((s, i) => (
                    <li key={i}>
                      <p className="font-semibold">
                        {s.name} {s.weight != null && <span className="text-xs font-medium text-muted">· peso {s.weight}</span>}
                      </p>
                      <ul className="mt-1 space-y-0.5 border-l-2 border-primary-soft/50 pl-3 text-xs text-muted">
                        {s.topics.map((t, j) => (
                          <li key={j}>{t}</li>
                        ))}
                        {s.topics.length === 0 && <li className="italic">Nenhum assunto reconhecido</li>}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              {parsed.length} disciplinas · {topicCount} assuntos
            </p>
            <Button type="submit" className="mt-4" disabled={!valid} loading={importNotice.isPending}>
              Importar para meu plano
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
