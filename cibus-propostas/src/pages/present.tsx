import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FileDown, Loader2, Maximize, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlideFit } from '@/components/slides/frame'
import { buildDeck } from '@/components/slides/slides'
import { useProposal } from '@/hooks/use-proposal'
import { usePdfExport } from '@/hooks/use-pdf'
import { useAppData } from '@/lib/app-data'
import { cn } from '@/lib/utils'
import { Loading, NotFound } from '@/components/status-pages'

export default function Present() {
  const { id } = useParams()
  const { proposal: p, notFound } = useProposal(id)
  const data = useAppData()
  const deck = useMemo(() => (p ? buildDeck(p, data) : []), [p, data])
  const [i, setI] = useState(0)
  const pdf = usePdfExport()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) setI((x) => Math.min(x + 1, deck.length - 1))
      if (['ArrowLeft', 'PageUp'].includes(e.key)) setI((x) => Math.max(x - 1, 0))
      if (e.key === 'Home') setI(0)
      if (e.key === 'End') setI(deck.length - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck.length])

  if (notFound) return <NotFound />
  if (!p) return <Loading />
  const cur = deck[i]

  return (
    <div className="flex h-screen flex-col bg-[#0A0F1C] text-white">
      <div className="flex h-14 shrink-0 items-center gap-3 px-4">
        <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Fechar">
          <Link to={`/propostas/${p.id}?step=review`}>
            <X />
          </Link>
        </Button>
        <div className="min-w-0 text-sm">
          <span className="font-bold">{p.client.company || 'Proposta'}</span>
          <span className="text-white/50"> · {cur?.label}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 max-sm:hidden">
            <Link to={`/propostas/${p.id}/editor`}>
              <Pencil /> Editar
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 max-sm:hidden"
            onClick={() => document.documentElement.requestFullscreen?.()}
          >
            <Maximize /> Tela cheia
          </Button>
          <Button size="sm" disabled={pdf.busy} onClick={() => pdf.generate(p)}>
            {pdf.busy ? <Loader2 className="animate-spin" /> : <FileDown />} Baixar PDF
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {cur && <SlideFit className="absolute inset-0 p-4 sm:px-20 sm:py-6">{cur.element}</SlideFit>}
        <button
          aria-label="Anterior"
          className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-20 sm:flex"
          disabled={i === 0}
          onClick={() => setI(i - 1)}
        >
          <ArrowLeft />
        </button>
        <button
          aria-label="Próximo"
          className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-20 sm:flex"
          disabled={i >= deck.length - 1}
          onClick={() => setI(i + 1)}
        >
          <ArrowRight />
        </button>
      </div>

      <div className="flex h-16 shrink-0 items-center justify-center gap-4">
        <Button variant="ghost" className="text-white hover:bg-white/10" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ArrowLeft /> Anterior
        </Button>
        <div className="flex items-center gap-1.5">
          {deck.map((s, j) => (
            <button
              key={s.id}
              aria-label={`Ir para ${s.label}`}
              onClick={() => setI(j)}
              className={cn('h-1.5 rounded-full transition-all', j === i ? 'w-6 bg-brand' : 'w-1.5 bg-white/25 hover:bg-white/50')}
            />
          ))}
        </div>
        <Button variant="ghost" className="text-white hover:bg-white/10" disabled={i >= deck.length - 1} onClick={() => setI(i + 1)}>
          Próximo <ArrowRight />
        </Button>
      </div>
    </div>
  )
}
