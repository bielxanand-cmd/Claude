import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { AppDataProvider } from '@/lib/app-data'
import { supabase } from '@/lib/repo'
import Dashboard from '@/pages/dashboard'
import Login from '@/pages/login'
import { Loading } from '@/components/status-pages'

const Wizard = lazy(() => import('@/pages/wizard'))
const Editor = lazy(() => import('@/pages/editor'))
const Present = lazy(() => import('@/pages/present'))
const Admin = lazy(() => import('@/pages/admin'))

function Routed() {
  return (
    <AppDataProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="/propostas/:id" element={<Wizard />} />
          <Route path="/propostas/:id/editor" element={<Editor />} />
          <Route path="/propostas/:id/apresentar" element={<Present />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </AppDataProvider>
  )
}

/** Com Supabase configurado, exige login; no modo local abre direto. */
function AuthGate() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!supabase) return <Routed />
  if (session === undefined) return <Loading />
  return session ? <Routed /> : <Login />
}

// Build para hospedagem sem controle de rotas (ex.: link de teste no claude.ai)
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter

export default function App() {
  return (
    <Router>
      <AuthGate />
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </Router>
  )
}
