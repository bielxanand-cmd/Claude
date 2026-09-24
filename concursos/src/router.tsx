import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { PageSkeleton } from '@/components/study/feedback'
import { useSelection } from '@/data/queries'
import { LandingPage } from '@/pages/landing-page'

/** Carrega cada página sob demanda (divide o bundle por rota). */
function page<M extends Record<string, React.ComponentType>>(loader: () => Promise<M>, name: keyof M) {
  return async () => ({ Component: (await loader())[name] })
}

/** Rotas de estudo exigem um cargo selecionado; sem ele, o usuário vai para o onboarding. */
function RequireSelection() {
  const selection = useSelection()
  if (selection.isLoading) return <PageSkeleton />
  if (!selection.data) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function AppLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background" aria-busy="true" aria-label="Carregando">
      <span className="size-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
    </div>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/onboarding', lazy: page(() => import('@/pages/onboarding-page'), 'OnboardingPage'), HydrateFallback: AppLoading },
  {
    element: <AppShell />,
    HydrateFallback: AppLoading,
    children: [
      {
        element: <RequireSelection />,
        children: [
          { path: '/dashboard', lazy: page(() => import('@/pages/dashboard-page'), 'DashboardPage') },
          { path: '/disciplinas', lazy: page(() => import('@/pages/subjects-page'), 'SubjectsPage') },
          { path: '/disciplina/:id', lazy: page(() => import('@/pages/subject-page'), 'SubjectPage') },
          { path: '/assunto/:id', lazy: page(() => import('@/pages/topic-page'), 'TopicPage') },
          { path: '/resumos', lazy: page(() => import('@/pages/summaries-page'), 'SummariesPage') },
          { path: '/progresso', lazy: page(() => import('@/pages/progress-page'), 'ProgressPage') },
          { path: '/concursos', lazy: page(() => import('@/pages/contests-page'), 'ContestsPage') },
        ],
      },
      { path: '/carreiras', lazy: page(() => import('@/pages/careers-page'), 'CareersPage') },
      { path: '/cargos', lazy: page(() => import('@/pages/positions-page'), 'PositionsPage') },
      { path: '/cargo/:id', lazy: page(() => import('@/pages/position-page'), 'PositionPage') },
      { path: '/configuracoes', lazy: page(() => import('@/pages/settings-page'), 'SettingsPage') },
      { path: '*', lazy: page(() => import('@/pages/not-found-page'), 'NotFoundPage') },
    ],
  },
])
