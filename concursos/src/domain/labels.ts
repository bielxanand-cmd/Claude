import { SPHERE_LABEL, stateName } from '@/lib/states'
import type { Contest, StudyPlan, UserSelection } from './types'

/** Nome curto do órgão de referência para o cargo selecionado (ex.: "SEFAZ SP"). */
export function referenceOrganization(plan: StudyPlan, selection: Pick<UserSelection, 'sphere' | 'state'> | null): string {
  const contests = plan.contests
  const inState = selection?.state ? contests.find((c) => c.state === selection.state && c.sphere === selection.sphere) : undefined
  if (inState) return inState.organizationShort
  const shorts = new Set(contests.filter((c) => !selection || c.sphere === selection.sphere).map((c) => c.organizationShort))
  if (shorts.size === 1) return [...shorts][0]
  if (selection?.state) return `${SPHERE_LABEL[selection.sphere]} · ${selection.state}`
  return selection ? SPHERE_LABEL[selection.sphere] : plan.career.name
}

export function positionTitle(plan: StudyPlan, selection: Pick<UserSelection, 'sphere' | 'state'> | null): string {
  return `${plan.position.name} — ${referenceOrganization(plan, selection)}`
}

export function contestLabel(contest: Contest): string {
  return [contest.organizationShort, contest.year].filter(Boolean).join(' · ')
}

export function contestLocation(contest: Contest): string {
  if (contest.sphere === 'federal') return 'Federal'
  if (contest.city) return `${contest.city} · ${contest.state}`
  return stateName(contest.state)
}
