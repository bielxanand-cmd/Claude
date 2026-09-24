import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS } from '@/data/seed'
import { repo } from './repo'
import type { AppSettings, CaseDef, Executive, ModuleDef } from './types'
import { hexToRgbTriplet } from './utils'

interface AppData {
  ready: boolean
  settings: AppSettings
  modules: ModuleDef[]
  cases: CaseDef[]
  executives: Executive[]
  reload: () => Promise<void>
}

const Ctx = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AppData, 'reload'>>({
    ready: false,
    settings: DEFAULT_SETTINGS,
    modules: [],
    cases: [],
    executives: [],
  })

  const reload = useCallback(async () => {
    const [settings, modules, cases, executives] = await Promise.all([
      repo.getSettings(),
      repo.listModules(),
      repo.listCases(),
      repo.listExecutives(),
    ])
    setState({
      ready: true,
      settings: { ...DEFAULT_SETTINGS, ...settings, defaults: { ...DEFAULT_SETTINGS.defaults, ...settings?.defaults } },
      modules: [...modules].sort((a, b) => a.sortOrder - b.sortOrder),
      cases,
      executives,
    })
  }, [])

  useEffect(() => {
    reload().catch((e) => {
      console.error(e)
      setState((s) => ({ ...s, ready: true }))
    })
  }, [reload])

  // Cores da marca configuráveis no painel administrativo
  useEffect(() => {
    const root = document.documentElement
    const b = hexToRgbTriplet(state.settings.brandColor)
    const i = hexToRgbTriplet(state.settings.inkColor)
    if (b) root.style.setProperty('--brand', b)
    if (i) root.style.setProperty('--ink', i)
  }, [state.settings.brandColor, state.settings.inkColor])

  const value = useMemo(() => ({ ...state, reload }), [state, reload])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppData fora do provider')
  return v
}
