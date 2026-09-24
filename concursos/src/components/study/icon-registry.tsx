import {
  Archive,
  Banknote,
  BookMarked,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Calculator,
  Code,
  Eye,
  FileText,
  Gavel,
  Globe,
  GraduationCap,
  HandHeart,
  Handshake,
  HeartPulse,
  Landmark,
  Languages,
  Laptop,
  Layers,
  Monitor,
  Percent,
  Receipt,
  Scale,
  SearchCheck,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { createElement } from 'react'
import { cn } from '@/lib/utils'

/** Ícones referenciados por nome no banco (colunas `icon`). */
const ICONS: Record<string, LucideIcon> = {
  archive: Archive,
  banknote: Banknote,
  'book-marked': BookMarked,
  'book-open': BookOpen,
  brain: Brain,
  briefcase: Briefcase,
  'building-2': Building2,
  calculator: Calculator,
  code: Code,
  eye: Eye,
  'file-text': FileText,
  gavel: Gavel,
  globe: Globe,
  'graduation-cap': GraduationCap,
  'hand-heart': HandHeart,
  handshake: Handshake,
  'heart-pulse': HeartPulse,
  landmark: Landmark,
  languages: Languages,
  laptop: Laptop,
  layers: Layers,
  monitor: Monitor,
  percent: Percent,
  receipt: Receipt,
  scale: Scale,
  'search-check': SearchCheck,
  shield: Shield,
  'sliders-horizontal': SlidersHorizontal,
  'trending-up': TrendingUp,
  users: Users,
  wallet: Wallet,
}

export const iconFor = (name: string | undefined): LucideIcon => (name && ICONS[name]) || BookOpen

/** Ícone em "pastilha" colorida, usado em cards de disciplina/carreira. */
export function IconTile({ icon, className, size = 'md' }: { icon: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-xl bg-primary-tint text-primary dark:text-primary-soft',
        size === 'sm' && 'size-8 rounded-lg [&_svg]:size-4',
        size === 'md' && 'size-10 [&_svg]:size-5',
        size === 'lg' && 'size-14 rounded-2xl [&_svg]:size-7',
        className,
      )}
      aria-hidden
    >
      {createElement(iconFor(icon))}
    </span>
  )
}
