import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowLeftRight, Menu, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigation } from 'react-router-dom'
import { DemoBadge } from '@/components/study/feedback'
import { Button } from '@/components/ui/button'
import { SheetContent } from '@/components/ui/dialog'
import { useStudy } from '@/data/queries'
import { positionTitle } from '@/domain/labels'
import { Logo } from './logo'
import { SearchDialog } from './search-dialog'
import { Sidebar, SidebarContent } from './sidebar'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { plan, selection } = useStudy()
  const location = useLocation()
  const navigation = useNavigation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const title = plan ? positionTitle(plan, selection) : ''

  return (
    <div className="min-h-dvh">
      {navigation.state === 'loading' && (
        <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden" role="progressbar" aria-label="Carregando página">
          <div className="h-full w-1/3 animate-[route-progress_1s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      <a href="#conteudo" className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Pular para o conteúdo
      </a>
      <Sidebar />

      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </DialogPrimitive.Root>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
              <Menu className="!size-5" />
            </Button>
            <Link to="/dashboard" className="lg:hidden" aria-label="Início">
              <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
            </Link>

            <div className="min-w-0 flex-1">
              {plan && (
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-bold sm:text-[15px]" title={title}>
                    {title}
                  </p>
                  {plan.hasDemoData && <DemoBadge className="hidden xl:inline-flex" />}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-subtle shadow-soft transition hover:border-border-strong md:flex"
            >
              <Search className="size-4" aria-hidden />
              <span className="flex-1 text-left">Pesquisar…</span>
              <kbd className="rounded-md border border-border px-1.5 text-[11px] font-semibold">Ctrl K</kbd>
            </button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Pesquisar">
              <Search className="!size-5" />
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/onboarding">
                <ArrowLeftRight /> Trocar concurso
              </Link>
            </Button>
          </div>
        </header>

        <main id="conteudo" className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <Outlet />
        </main>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
