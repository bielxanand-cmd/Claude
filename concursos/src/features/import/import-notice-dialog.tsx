import { ArrowLeft, Check, ChevronDown, ClipboardPaste, FileText, FileUp, Loader2, Sparkles, Undo2, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { useImportNotice } from '@/data/queries'
import {
  detectNoticeMetadata,
  findSyllabusSection,
  parseSyllabus,
  toImportSubjects,
  type Granularity,
  type ParsedSubject,
} from '@/domain/notice-parser'
import type { Sphere } from '@/domain/types'
import { BRAZIL_STATES, SPHERE_LABEL } from '@/lib/states'
import { cn } from '@/lib/utils'
import { extractPdfText, PdfReadError } from './pdf-text'

const EXAMPLE = `LÍNGUA PORTUGUESA: 1 Compreensão e interpretação de textos. 2 Domínio da ortografia oficial. 3 Domínio da estrutura morfossintática do período. 3.1 Emprego dos sinais de pontuação. 3.2 Concordância verbal e nominal. 3.3 Emprego do sinal indicativo de crase.
DIREITO TRIBUTÁRIO (peso 2): 1. Competência tributária. 2. Crédito tributário: constituição e lançamento. 3. Extinção do crédito tributário.`

type Step = 'source' | 'review'
type SourceTab = 'pdf' | 'text'

interface ReviewSubject extends ParsedSubject {
  key: number
  include: boolean
  expanded: boolean
  removed: Set<number>
}

interface Analysis {
  subjects: ReviewSubject[]
  heading: string | null
  page: number | null
  fileName: string | null
}

const selectClass = 'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm shadow-soft outline-none focus:border-primary'

/**
 * Importação de edital: envia o PDF (ou cola o texto), o app localiza o
 * conteúdo programático, reconhece disciplinas/assuntos e mostra tudo para
 * revisão antes de gravar no plano.
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
  const [step, setStep] = useState<Step>('source')
  const [tab, setTab] = useState<SourceTab>('pdf')
  const [text, setText] = useState('')
  const [reading, setReading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [granularity, setGranularity] = useState<Granularity>('topics')

  const [orgShort, setOrgShort] = useState('')
  const [organization, setOrganization] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [examBoard, setExamBoard] = useState('')
  const [sphere, setSphere] = useState<Sphere>(defaultSphere)
  const [uf, setUf] = useState<string>(defaultState ?? '')
  const [url, setUrl] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const importNotice = useImportNotice()

  const reset = () => {
    setStep('source')
    setText('')
    setError(null)
    setReading(null)
    setAnalysis(null)
    setGranularity('topics')
    setOrgShort('')
    setOrganization('')
    setExamBoard('')
    setUrl('')
    setSphere(defaultSphere)
    setUf(defaultState ?? '')
    setYear(String(new Date().getFullYear()))
  }

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setTimeout(reset, 200)
  }

  /** Texto completo (PDF ou colado) → seção de conteúdos → disciplinas + metadados. */
  const analyze = (fullText: string, source: { pages?: string[]; fileName?: string }) => {
    const section = findSyllabusSection(fullText)
    const parsed = parseSyllabus(section.text)
    if (parsed.length === 0) {
      setError(
        source.pages
          ? 'Não encontramos o conteúdo programático neste PDF. Copie o trecho das disciplinas e use “Colar texto”.'
          : 'Não reconhecemos disciplinas neste texto. Use títulos como “LÍNGUA PORTUGUESA:” seguidos dos itens numerados.',
      )
      return
    }

    let page: number | null = null
    if (source.pages && section.heading) {
      let line = 0
      for (let i = 0; i < source.pages.length; i++) {
        line += source.pages[i].split('\n').length
        if (line > section.startLine) {
          page = i + 1
          break
        }
      }
    }

    const meta = detectNoticeMetadata(fullText)
    if (meta.organizationShort) setOrgShort(meta.organizationShort)
    if (meta.organization) setOrganization(meta.organization)
    if (meta.year) setYear(String(meta.year))
    if (meta.examBoard) setExamBoard(meta.examBoard)
    if (meta.sphere) setSphere(meta.sphere)

    setAnalysis({
      subjects: parsed.map((s, key) => ({ ...s, key, include: true, expanded: false, removed: new Set() })),
      heading: section.heading,
      page,
      fileName: source.fileName ?? null,
    })
    setError(null)
    setStep('review')
  }

  const readFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Envie um arquivo PDF.')
      return
    }
    setError(null)
    setReading('Abrindo o PDF…')
    try {
      const { pages } = await extractPdfText(file, (page, total) => setReading(`Lendo página ${page} de ${total}…`))
      setReading('Procurando o conteúdo programático…')
      analyze(pages.join('\n'), { pages, fileName: file.name })
    } catch (err) {
      setError(err instanceof PdfReadError ? err.message : 'Não foi possível ler o PDF.')
    } finally {
      setReading(null)
    }
  }

  const updateSubject = (key: number, patch: Partial<ReviewSubject>) =>
    setAnalysis((a) => a && { ...a, subjects: a.subjects.map((s) => (s.key === key ? { ...s, ...patch } : s)) })

  const toggleTopic = (subject: ReviewSubject, index: number) => {
    const removed = new Set(subject.removed)
    if (removed.has(index)) removed.delete(index)
    else removed.add(index)
    updateSubject(subject.key, { removed })
  }

  const selected = useMemo(
    () =>
      (analysis?.subjects ?? [])
        .filter((s) => s.include && s.name.trim())
        .map((s) => ({ ...s, name: s.name.trim(), topics: s.topics.filter((_, i) => !s.removed.has(i)) }))
        .filter((s) => s.topics.length > 0),
    [analysis],
  )
  const importSubjects = useMemo(() => toImportSubjects(selected, granularity), [selected, granularity])
  const topicCount = importSubjects.reduce((n, s) => n + s.topics.length, 0)
  const hasSubtopics = analysis?.subjects.some((s) => s.topics.some((t) => t.details.length > 0)) ?? false

  const submit = () => {
    if (!orgShort.trim() || importSubjects.length === 0) return
    importNotice.mutate(
      {
        positionId,
        contest: {
          name: `Concurso ${orgShort.trim()}${year ? ` ${year}` : ''}`,
          organization: organization.trim() || orgShort.trim(),
          organizationShort: orgShort.trim(),
          sphere,
          state: sphere === 'federal' ? null : uf || null,
          city: null,
          year: year ? Number(year) : null,
          examBoard: examBoard.trim() || null,
          noticeUrl: url.trim() || null,
          noticeDate: null,
          origin: analysis?.fileName ? 'pdf' : 'import',
        },
        subjects: importSubjects,
      },
      {
        onSuccess: () => {
          toast.success('Edital importado!', { description: `${importSubjects.length} disciplinas e ${topicCount} assuntos adicionados ao seu plano.` })
          close(false)
        },
        onError: (err) => toast.error('Falha ao importar', { description: err instanceof Error ? err.message : undefined }),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-4xl p-0">
        <div className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5 text-primary" /> Importar edital
          </DialogTitle>
          <DialogDescription>
            {step === 'source'
              ? 'Envie o PDF do edital. O app encontra o conteúdo programático e identifica as disciplinas e os assuntos para você revisar.'
              : 'Confira o que foi identificado. Você pode renomear, desmarcar disciplinas e remover assuntos antes de importar.'}
          </DialogDescription>
        </div>

        {step === 'source' ? (
          <div className="px-6 pb-6 pt-5">
            <div role="tablist" aria-label="Origem do edital" className="mb-4 inline-flex rounded-xl bg-foreground/[0.05] p-1">
              {(
                [
                  ['pdf', 'Enviar PDF', FileText],
                  ['text', 'Colar texto', ClipboardPaste],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => {
                    setTab(value)
                    setError(null)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold text-muted transition',
                    tab === value && 'bg-surface text-foreground shadow-soft',
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>

            {tab === 'pdf' ? (
              <label
                htmlFor="notice-file"
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file && !reading) void readFile(file)
                }}
                className={cn(
                  'flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
                  dragging ? 'border-primary bg-primary-tint' : 'border-border-strong hover:border-primary/60 hover:bg-primary-tint/40',
                  reading && 'pointer-events-none',
                )}
              >
                {reading ? (
                  <>
                    <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                    <p className="mt-3 text-sm font-semibold" aria-live="polite">
                      {reading}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="grid size-14 place-items-center rounded-2xl bg-primary-tint text-primary dark:text-primary-soft">
                      <FileUp className="size-7" aria-hidden />
                    </span>
                    <p className="mt-4 font-bold">Arraste o PDF do edital aqui</p>
                    <p className="mt-1 text-sm text-muted">ou clique para escolher o arquivo</p>
                    <p className="mt-4 max-w-sm text-xs text-subtle">O arquivo é lido no seu navegador e não é enviado a nenhum servidor.</p>
                  </>
                )}
                <input
                  ref={fileInput}
                  id="notice-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void readFile(file)
                    e.target.value = ''
                  }}
                />
              </label>
            ) : (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label htmlFor="syllabus" className="mb-0">
                    Texto do edital ou do conteúdo programático
                  </Label>
                  <button type="button" onClick={() => setText(EXAMPLE)} className="text-xs font-semibold text-primary hover:underline">
                    Ver exemplo
                  </button>
                </div>
                <Textarea
                  id="syllabus"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={'LÍNGUA PORTUGUESA: 1 Compreensão de textos. 2 Ortografia oficial. 2.1 Acentuação.\nDIREITO CONSTITUCIONAL: 1 Poder constituinte. 2 …'}
                  className="min-h-56 font-mono text-[13px]"
                />
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => analyze(text, {})} disabled={text.trim().length < 10}>
                    <Sparkles /> Identificar disciplinas
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-foreground">
                {error}
              </p>
            )}
          </div>
        ) : (
          analysis && (
            <>
              <div className="space-y-6 px-6 pb-6 pt-5">
                <div className="flex items-start gap-3 rounded-2xl bg-success-tint p-4 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-strong" aria-hidden />
                  <p>
                    Encontramos <strong>{analysis.subjects.length} disciplinas</strong> e{' '}
                    <strong>{analysis.subjects.reduce((n, s) => n + s.topics.length, 0)} assuntos</strong>
                    {analysis.heading && (
                      <>
                        {' '}
                        na seção “{analysis.heading}”{analysis.page && <> (página {analysis.page})</>}
                      </>
                    )}
                    {analysis.fileName && <span className="text-muted"> · {analysis.fileName}</span>}
                  </p>
                </div>

                <section aria-labelledby="meta-title">
                  <h3 id="meta-title" className="mb-3 text-sm font-bold">
                    Dados do edital
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div>
                      <Label htmlFor="org-short">Órgão (sigla)</Label>
                      <Input id="org-short" value={orgShort} onChange={(e) => setOrgShort(e.target.value)} placeholder="Ex.: PRF" required />
                    </div>
                    <div>
                      <Label htmlFor="year">Ano</Label>
                      <Input id="year" type="number" min={1980} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="org">Nome do órgão</Label>
                      <Input id="org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Ex.: Polícia Rodoviária Federal" />
                    </div>
                    <div>
                      <Label htmlFor="board">Banca</Label>
                      <Input id="board" value={examBoard} onChange={(e) => setExamBoard(e.target.value)} placeholder="Ex.: Cebraspe" />
                    </div>
                    <div>
                      <Label htmlFor="sphere">Esfera</Label>
                      <select id="sphere" value={sphere} onChange={(e) => setSphere(e.target.value as Sphere)} className={selectClass}>
                        {(Object.keys(SPHERE_LABEL) as Sphere[]).map((s) => (
                          <option key={s} value={s}>
                            {SPHERE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {sphere !== 'federal' && (
                      <div>
                        <Label htmlFor="import-uf">Estado</Label>
                        <select id="import-uf" value={uf} onChange={(e) => setUf(e.target.value)} className={selectClass}>
                          <option value="">Selecione…</option>
                          {BRAZIL_STATES.map((s) => (
                            <option key={s.uf} value={s.uf}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className={sphere === 'federal' ? 'col-span-2' : 'col-span-2 md:col-span-1'}>
                      <Label htmlFor="url">Link do edital</Label>
                      <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (opcional)" />
                    </div>
                  </div>
                </section>

                {hasSubtopics && (
                  <section aria-labelledby="granularity-title">
                    <h3 id="granularity-title" className="mb-1 text-sm font-bold">
                      Subitens do edital (4.1, 4.2…)
                    </h3>
                    <p className="mb-3 text-xs text-muted">Escolha como os subitens entram no seu plano.</p>
                    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          ['topics', 'Guardar como detalhes do assunto', 'Menos assuntos, com a lista do edital dentro de cada um.'],
                          ['subtopics', 'Transformar em assuntos', 'Cada subitem vira um assunto para marcar e resumir.'],
                        ] as const
                      ).map(([value, title, hint]) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={granularity === value}
                          onClick={() => setGranularity(value)}
                          className={cn(
                            'rounded-xl border p-3 text-left transition',
                            granularity === value ? 'border-primary bg-primary-tint ring-4 ring-ring/15' : 'border-border hover:border-border-strong',
                          )}
                        >
                          <span className="block text-sm font-semibold">{title}</span>
                          <span className="block text-xs text-muted">{hint}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section aria-labelledby="subjects-title">
                  <h3 id="subjects-title" className="mb-3 text-sm font-bold">
                    Disciplinas e assuntos
                  </h3>
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                    {analysis.subjects.map((s, i) => {
                      const showGroup = s.group && s.group !== analysis.subjects[i - 1]?.group
                      const kept = s.topics.length - s.removed.size
                      return (
                        <li key={s.key} className={cn(!s.include && 'bg-foreground/[0.02]')}>
                          {showGroup && <p className="bg-surface-2 px-4 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-wider text-subtle">{s.group}</p>}
                          <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                            <input
                              type="checkbox"
                              checked={s.include}
                              onChange={(e) => updateSubject(s.key, { include: e.target.checked })}
                              aria-label={`Importar ${s.name}`}
                              className="size-4 shrink-0 accent-[var(--primary)]"
                            />
                            <input
                              value={s.name}
                              onChange={(e) => updateSubject(s.key, { name: e.target.value })}
                              aria-label="Nome da disciplina"
                              disabled={!s.include}
                              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none transition hover:border-border focus:border-primary disabled:text-subtle"
                            />
                            <button
                              type="button"
                              onClick={() => updateSubject(s.key, { expanded: !s.expanded })}
                              aria-expanded={s.expanded}
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-foreground/[0.05] hover:text-foreground"
                            >
                              {kept} {kept === 1 ? 'assunto' : 'assuntos'}
                              <ChevronDown className={cn('size-4 transition', s.expanded && 'rotate-180')} aria-hidden />
                            </button>
                          </div>
                          {s.expanded && (
                            <ol className="space-y-1 px-4 pb-3 pl-10 sm:pl-11">
                              {s.topics.map((t, index) => {
                                const removed = s.removed.has(index)
                                return (
                                  <li key={index} className="group flex items-start gap-2 text-sm">
                                    <span className={cn('flex-1', removed && 'text-subtle line-through')}>
                                      {t.name}
                                      {t.details.length > 0 && (
                                        <span className="mt-0.5 block text-xs text-muted">
                                          {t.details.length} {t.details.length === 1 ? 'subitem' : 'subitens'}: {t.details.slice(0, 3).join('; ')}
                                          {t.details.length > 3 && '…'}
                                        </span>
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleTopic(s, index)}
                                      aria-label={removed ? `Restaurar ${t.name}` : `Remover ${t.name}`}
                                      className="grid size-7 shrink-0 place-items-center rounded-lg text-subtle transition hover:bg-foreground/[0.06] hover:text-foreground"
                                    >
                                      {removed ? <Undo2 className="size-3.5" /> : <X className="size-3.5" />}
                                    </button>
                                  </li>
                                )
                              })}
                            </ol>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Disciplinas com o mesmo nome de uma já existente no seu plano são unificadas automaticamente.</p>
                </section>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-surface px-6 py-4 sm:flex-row sm:items-center">
                <Button variant="ghost" onClick={() => setStep('source')}>
                  <ArrowLeft /> Voltar
                </Button>
                <p className="flex-1 text-center text-xs text-muted sm:text-right">
                  {importSubjects.length} disciplinas · {topicCount} assuntos
                  {!orgShort.trim() && <span className="block text-danger">Informe a sigla do órgão.</span>}
                </p>
                <Button onClick={submit} disabled={!orgShort.trim() || importSubjects.length === 0} loading={importNotice.isPending}>
                  Importar para meu plano
                </Button>
              </div>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
