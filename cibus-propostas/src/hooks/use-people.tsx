import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useAppData } from '@/lib/app-data'
import { repo } from '@/lib/repo'
import type { Identity, PersonProfile } from '@/lib/repo/types'
import type { PersonRef, Proposal } from '@/lib/types'
import { cn, initials } from '@/lib/utils'

/** Quem está usando o sistema agora. */
export function useMe() {
  const { ready } = useAppData()
  const [me, setMe] = useState<PersonRef | null | undefined>(undefined)
  useEffect(() => {
    if (ready) repo.whoAmI().then(setMe, () => setMe(null))
  }, [ready])
  return me
}

/*
 * Identificação no link compartilhado: cada pessoa diz uma vez com qual
 * executivo ela corresponde. O nome vira o autor das propostas e o executivo
 * vira o padrão das propostas novas.
 */
type IdentityState = { loaded: boolean; supported: boolean; identity: Identity | null }
let identityState: IdentityState = { loaded: false, supported: false, identity: null }
let identityLoading: Promise<void> | null = null
const identityListeners = new Set<() => void>()
const emitIdentity = (next: IdentityState) => {
  identityState = next
  identityListeners.forEach((l) => l())
}

export function useIdentity() {
  const { ready } = useAppData()
  const state = useSyncExternalStore(
    (l) => (identityListeners.add(l), () => identityListeners.delete(l)),
    () => identityState,
  )
  useEffect(() => {
    if (!ready || identityLoading) return
    identityLoading = (async () => {
      if (!repo.getIdentity) return emitIdentity({ loaded: true, supported: false, identity: null })
      const [identity, me] = await Promise.all([repo.getIdentity().catch(() => null), repo.whoAmI().catch(() => null)])
      emitIdentity({ loaded: true, supported: !!me?.id, identity })
    })()
  }, [ready])
  const save = async (identity: Identity) => {
    await repo.setIdentity!(identity)
    emitIdentity({ ...identityState, identity })
  }
  return { ...state, save }
}

/** Resolve nomes e avatares atuais das pessoas citadas nas propostas. */
export function usePeople(proposals: Proposal[] | null) {
  const ids = useMemo(() => {
    const set = new Set<string>()
    for (const p of proposals ?? []) {
      if (p.createdBy?.id) set.add(p.createdBy.id)
      if (p.updatedBy?.id) set.add(p.updatedBy.id)
    }
    return [...set].sort()
  }, [proposals])
  const key = ids.join(',')
  const { ready } = useAppData()
  const [people, setPeople] = useState<Record<string, PersonProfile>>({})
  useEffect(() => {
    if (!ready) return
    let alive = true
    repo.resolvePeople(ids).then((r) => alive && setPeople(r), () => undefined)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready])
  return people
}

/** Nome para exibir: perfil atual → nome guardado → executivo da proposta. */
export function personName(ref: PersonRef | undefined, people: Record<string, PersonProfile>, fallback = 'Não identificado') {
  if (!ref) return fallback
  return (ref.id && people[ref.id]?.name) || ref.name || fallback
}

export function PersonChip({
  person,
  people,
  isMe,
  fallback,
  className,
}: {
  person: PersonRef | undefined
  people: Record<string, PersonProfile>
  isMe?: boolean
  fallback?: string
  className?: string
}) {
  const profile = person?.id ? people[person.id] : undefined
  const name = personName(person, people, fallback)
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[10px] font-bold text-ink/70"
          style={profile?.color ? { background: profile.color, color: '#fff' } : undefined}
        >
          {person ? initials(name) : '?'}
        </span>
      )}
      <span className="truncate">
        {name}
        {isMe && <span className="text-muted-foreground"> (você)</span>}
      </span>
    </span>
  )
}
