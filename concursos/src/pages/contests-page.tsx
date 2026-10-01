import { FileSearch, FileUp, GitMerge, Plus, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DemoNotice, ErrorState, PageSkeleton } from '@/components/study/feedback'
import { IconTile } from '@/components/study/icon-registry'
import { MyContests } from '@/components/study/my-contests'
import { PageHeader, SectionTitle } from '@/components/study/page-header'
import { ContestRow } from '@/components/study/sources'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useDeleteContest, useStudy } from '@/data/queries'
import { isUserContest, type Contest } from '@/domain/types'
import { toast } from 'sonner'
import { dataSource } from '@/data/sources'
import { referenceOrganization } from '@/domain/labels'
import { planProgress } from '@/domain/progress'
import { ImportNoticeDialog } from '@/features/import/import-notice-dialog'
import { SPHERE_LABEL, stateName } from '@/lib/states'
import { percent } from '@/lib/text'

const HOW_IT_WORKS = [
  { icon: FileSearch, title: 'Editais anteriores', text: 'Reunimos os editais já publicados para o cargo.' },
  { icon: GitMerge, title: 'Consolidação', text: 'Disciplinas e assuntos são unificados e contamos em quantos editais cada um aparece.' },
  { icon: Upload, title: 'Sua base cresce', text: 'Importe novos editais a qualquer momento; a fonte de cada item fica registrada.' },
]

export function ContestsPage() {
  const { plan, selection, statuses, isLoading, error, refetch } = useStudy()
  const [params, setParams] = useSearchParams()
  const [importOpen, setImportOpen] = useState(params.get('importar') === '1')
  const [toDelete, setToDelete] = useState<Contest | null>(null)
  const deleteContest = useDeleteContest()

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !plan || !selection) return <PageSkeleton />

  const progress = planProgress(plan, statuses)
  const details = [
    { label: 'Carreira', value: plan.career.name },
    { label: 'Cargo', value: plan.position.name },
    { label: 'Abrangência', value: SPHERE_LABEL[selection.sphere] },
    { label: 'Estado', value: selection.state ? stateName(selection.state) : '—' },
    { label: 'Órgão de referência', value: referenceOrganization(plan, selection) },
    { label: 'Progresso', value: percent(progress.ratio) },
  ]

  const setImport = (open: boolean) => {
    setImportOpen(open)
    if (!open && params.has('importar')) setParams({}, { replace: true })
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Meu concurso"
        title={plan.position.name}
        description={`${plan.career.name} · base de ${plan.contests.length} ${plan.contests.length === 1 ? 'edital' : 'editais'}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/onboarding">
                <Plus /> Outro concurso
              </Link>
            </Button>
            <Button onClick={() => setImport(true)}>
              <FileUp /> Importar edital
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <IconTile icon={plan.career.icon} />
              <div>
                <p className="font-bold">{plan.position.name}</p>
                <p className="text-sm text-muted">{plan.position.description}</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {details.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-semibold text-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <Button asChild variant="link" className="mt-5">
              <Link to={`/cargo/${plan.position.id}`}>Abrir página do cargo →</Link>
            </Button>
          </Card>

          {plan.hasDemoData && <DemoNotice />}

          <MyContests />

          <section>
            <SectionTitle title="Editais utilizados como fonte" />
            {plan.contests.length === 0 ? (
              <Card className="p-6 text-sm text-muted">Nenhum edital ainda. Use “Importar edital” para começar.</Card>
            ) : (
              <Card className="p-2">
                <ul>
                  {plan.contests.map((c) => (
                    <ContestRow
                      key={c.id}
                      contest={c}
                      highlight={!!selection.state && c.state === selection.state}
                      onDelete={isUserContest(c.origin) ? () => setToDelete(c) : undefined}
                    />
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-bold">Como seu plano é montado</h2>
            <ol className="mt-4 space-y-4">
              {HOW_IT_WORKS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-tint text-primary dark:text-primary-soft">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {i + 1}. {title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-5 text-xs leading-relaxed text-muted">
            Fonte de dados: <strong className="text-foreground">{dataSource.kind === 'supabase' ? 'Supabase' : 'Local (navegador)'}</strong>. Upload de PDF e integração com
            fontes externas usarão o mesmo formato de importação.
          </Card>
        </aside>
      </div>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Excluir edital?</DialogTitle>
          <DialogDescription>
            O edital {toDelete?.organizationShort}
            {toDelete?.year ? ` ${toDelete.year}` : ''} sai do plano de {plan.position.name}. Disciplinas e assuntos que só ele cobrava deixam de aparecer; seus
            temas, questões e anexos desses assuntos ficam guardados e voltam se você importar o edital de novo.
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleteContest.isPending}
              onClick={() =>
                toDelete &&
                deleteContest.mutate(
                  { contestId: toDelete.id, positionId: plan.position.id },
                  {
                    onSuccess: () => {
                      toast('Edital excluído', { description: `${toDelete.organizationShort}${toDelete.year ? ` · ${toDelete.year}` : ''}` })
                      setToDelete(null)
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível excluir o edital.'),
                  },
                )
              }
            >
              <Trash2 /> Excluir edital
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportNoticeDialog open={importOpen} onOpenChange={setImport} positionId={plan.position.id} defaultSphere={selection.sphere} defaultState={selection.state} />
    </div>
  )
}
