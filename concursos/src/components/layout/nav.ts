import { BarChart3, BookOpen, Home, NotebookPen, Settings, Target, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/disciplinas', label: 'Disciplinas', icon: BookOpen },
  { to: '/resumos', label: 'Meus resumos', icon: NotebookPen },
  { to: '/progresso', label: 'Meu progresso', icon: BarChart3 },
  { to: '/concursos', label: 'Meu concurso', icon: Target },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]
