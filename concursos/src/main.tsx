import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-center"
        offset={{ bottom: 88 }}
        mobileOffset={{ bottom: 84 }}
        toastOptions={{
          classNames: {
            toast: '!rounded-2xl !border-border !bg-surface !text-foreground !shadow-pop !font-sans',
            description: '!text-muted',
            success: '[&_[data-icon]]:!text-success',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
