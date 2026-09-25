import { LogOut, Settings2, LayoutGrid, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { IdentityButton } from '@/components/identity-dialog'
import { CibusLogo } from '@/components/slides/primitives'
import { useAppData } from '@/lib/app-data'
import { repo, supabase } from '@/lib/repo'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { settings } = useAppData()
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors [&_svg]:size-4',
      isActive ? 'bg-ink text-white' : 'text-ink/70 hover:bg-ink/5 hover:text-ink',
    )
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
        <div className="container flex h-16 items-center gap-6">
          <NavLink to="/" className="flex items-center gap-3">
            <CibusLogo src={settings.logo} height={24} />
            <span className="hidden rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand sm:inline">Propostas</span>
          </NavLink>
          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="/" end className={link}>
              <LayoutGrid /> <span className="hidden sm:inline">Minhas propostas</span>
            </NavLink>
            <NavLink to="/equipe" className={link}>
              <Users /> <span className="hidden sm:inline">Painel da equipe</span>
            </NavLink>
            <NavLink to="/admin" className={link}>
              <Settings2 /> <span className="hidden sm:inline">Configurações</span>
            </NavLink>
            <IdentityButton />
            {supabase && (
              <button className={link({ isActive: false })} onClick={() => supabase!.auth.signOut()} title="Sair">
                <LogOut />
              </button>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
      {repo.mode !== 'supabase' && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-30 rounded-full border bg-white/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
          {repo.mode === 'shared' ? 'Banco compartilhado · a equipe vê as mesmas propostas' : 'Modo local · dados salvos neste navegador'}
        </div>
      )}
    </div>
  )
}
