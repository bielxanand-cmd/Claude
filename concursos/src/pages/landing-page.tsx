import { ArrowRight, BarChart3, FileSearch, NotebookPen } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { useSelection } from '@/data/queries'

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Baseado em editais anteriores',
    text: 'Disciplinas e assuntos consolidados a partir dos editais do seu cargo, com a fonte de cada item.',
  },
  { icon: NotebookPen, title: 'Resumos por assunto', text: 'Editor completo para resumo, pontos importantes, pegadinhas e observações.' },
  { icon: BarChart3, title: 'Progresso em tempo real', text: 'Saiba exatamente onde você está e o que falta estudar em cada disciplina.' },
]

const PREVIEW = [
  { name: 'Direito Tributário', value: 0.8 },
  { name: 'Contabilidade', value: 0.62 },
  { name: 'Língua Portuguesa', value: 0.91 },
  { name: 'Raciocínio Lógico', value: 0.45 },
]

export function LandingPage() {
  const selection = useSelection()
  if (selection.data) return <Navigate to="/dashboard" replace />

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#09090B] text-white">
      {/* brilhos de fundo */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#7C3AED] opacity-30 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-[#5B21B6] opacity-25 blur-[120px]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo light />
        <Link to="/cargos" className="text-sm font-medium text-white/70 transition hover:text-white">
          Explorar cargos
        </Link>
      </header>

      <main className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <section className="animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#C4B5FD]">
            <span className="size-1.5 rounded-full bg-[#22C55E]" /> Seu plano de estudos, montado a partir dos editais
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            Prepare-se para conquistar sua{' '}
            <span className="bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] bg-clip-text text-transparent">aprovação.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
            Organize seus estudos, acompanhe seu progresso e domine cada assunto do seu concurso.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-14 px-7 text-base">
              <Link to="/onboarding">
                Começar minha preparação <ArrowRight className="!size-5" />
              </Link>
            </Button>
            <p className="text-sm text-white/50 sm:ml-3">Grátis · sem cadastro para começar</p>
          </div>
        </section>

        <section aria-label="Prévia do painel" className="animate-fade-in [animation-delay:120ms]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_40px_120px_-40px_rgba(124,58,237,0.6)] backdrop-blur">
            <div className="rounded-[20px] bg-[#FFFFFF] p-6 text-[#09090B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#71717A]">Sua preparação</p>
                  <p className="mt-0.5 font-bold">Auditor Fiscal</p>
                </div>
                <span className="rounded-full bg-[#F3EEFF] px-2.5 py-1 text-xs font-semibold text-[#5B21B6]">Exemplo</span>
              </div>
              <div className="mt-6 flex items-center gap-5">
                <div className="relative grid size-24 place-items-center">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#F0F0F3" strokeWidth="10" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#7C3AED" strokeWidth="10" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="58" />
                  </svg>
                  <span className="text-xl font-extrabold">78%</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>124</strong> <span className="text-[#71717A]">de 158 assuntos</span>
                  </p>
                  <p>
                    <strong>87</strong> <span className="text-[#71717A]">resumos criados</span>
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {PREVIEW.map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{p.name}</span>
                      <span className="text-[#71717A]">{Math.round(p.value * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-[#F0F0F3]">
                      <div className="h-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" style={{ width: `${p.value * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="relative mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-3 sm:px-8">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.06]">
            <span className="grid size-10 place-items-center rounded-xl bg-[#7C3AED]/20 text-[#C4B5FD]">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">{text}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
