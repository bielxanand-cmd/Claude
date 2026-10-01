import { BarChart3, BookOpen, Flame, Home, NotebookPen, Settings, Target, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/disciplinas', label: 'Disciplinas', icon: BookOpen },
  { to: '/resumos', label: 'Meus resumos', icon: NotebookPen },
  { to: '/mais-cobrados', label: 'Mais cobrados', icon: Flame },
  { to: '/progresso', label: 'Meu progresso', icon: BarChart3 },
  { to: '/concursos', label: 'Meu concurso', icon: Target },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]
