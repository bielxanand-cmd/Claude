import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCreateManualTopic } from '@/data/queries'
import { normalize } from '@/lib/text'

/** Cria um assunto manual numa disciplina do plano. */
export function AddTopicDialog({
  open,
  onOpenChange,
  positionId,
  subjectId,
  subjectName,
  existingNames,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  positionId: string
  subjectId: string
  subjectName: string
  existingNames: string[]
}) {
  const [name, setName] = useState('')
  const [details, setDetails] = useState('')
  const create = useCreateManualTopic()
  const navigate = useNavigate()
  const duplicate = existingNames.some((n) => normalize(n) === normalize(name.trim()))

  const submit = (openAfter: boolean) => {
    const title = name.trim()
    if (!title || duplicate) return
    create.mutate(
      {
        positionId,
        subjectId,
        name: title,
        details: details
          .split('\n')
          .map((l) => l.replace(/^[\s•\-–*\d.)]+/, '').trim())
          .filter(Boolean),
      },
      {
        onSuccess: (topic) => {
          toast.success('Assunto criado', { description: topic.name })
          setName('')
          setDetails('')
          onOpenChange(false)
          if (openAfter) navigate(`/assunto/${topic.id}`)
        },
        onError: () => toast.error('Não foi possível criar o assunto.'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Adicionar assunto</DialogTitle>
        <DialogDescription>Um assunto de {subjectName} que você quer estudar, mesmo que não esteja nos editais. Ele entra na lista e no seu progresso.</DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit(true)
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Nome do assunto</span>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Poder constituinte" aria-label="Nome do assunto" />
            {duplicate && <span className="mt-1.5 block text-xs text-danger">Já existe um assunto com esse nome nesta disciplina.</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              O que estudar <span className="font-normal text-muted">(opcional, um item por linha)</span>
            </span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder={'Ex.:\nPoder originário\nPoder derivado reformador'}
              aria-label="O que estudar"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="outline" disabled={!name.trim() || duplicate || create.isPending} onClick={() => submit(false)}>
              Criar
            </Button>
            <Button type="submit" disabled={!name.trim() || duplicate} loading={create.isPending}>
              {!create.isPending && <Plus />} Criar e abrir
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
