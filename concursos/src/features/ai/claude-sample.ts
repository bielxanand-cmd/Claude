import { useEffect, useState } from 'react'

/**
 * Acesso ao Claude pela página publicada no claude.ai (capacidade `sample`).
 * Cada chamada usa a cota do próprio usuário e pede permissão na primeira
 * vez. Fora do claude.ai (ou quando indisponível) o recurso fica oculto.
 */
export interface SampleError {
  code: string
  message: string
  text?: string
}

type SampleOptions = { modelTier?: 'quick' | 'default' | 'complex'; signal?: AbortSignal; cache?: boolean }
export interface ClaudeSample {
  (input: string, options?: SampleOptions): Promise<{ text: string; truncated: boolean }>
  json<T = unknown>(input: string, options?: SampleOptions): Promise<T>
}

let samplePromise: Promise<ClaudeSample | null> | null = null

function loadSample(): Promise<ClaudeSample | null> {
  if (import.meta.env.VITE_CLOUD_STORAGE !== 'true') return Promise.resolve(null)
  const claude = (globalThis as { claude?: { use(name: 'sample'): Promise<ClaudeSample | null> } }).claude
  if (!claude?.use) return Promise.resolve(null)
  return (samplePromise ??= claude.use('sample').catch(() => null))
}

/** Hook: a função `sample` do Claude, ou `null` quando indisponível. */
export function useClaudeSample(): { sample: ClaudeSample | null; disable: () => void } {
  const [sample, setSample] = useState<ClaudeSample | null>(null)
  useEffect(() => {
    let alive = true
    void loadSample().then((s) => alive && setSample(() => s))
    return () => {
      alive = false
    }
  }, [])
  return { sample, disable: () => setSample(null) }
}

/** Códigos em que o recurso deve ser escondido nesta visita. */
export const HIDE_CODES = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'])

export function sampleErrorMessage(e: unknown): string {
  const code = (e as SampleError)?.code
  switch (code) {
    case 'not_granted':
      return 'Você não autorizou o uso do Claude nesta página.'
    case 'sampling_disabled':
      return 'O Claude não está disponível para a sua conta.'
    case 'rate_limited':
      return 'Muitas solicitações ou limite de uso atingido. Tente novamente em alguns minutos.'
    case 'session_expired':
      return 'Sua sessão expirou. Entre novamente no claude.ai.'
    case 'prompt_too_large':
      return 'O resumo é grande demais para enviar de uma vez. Tente com menos texto.'
    case 'invalid_json':
    case 'empty_completion':
      return 'A resposta veio em formato inesperado. Tente de novo.'
    case 'refused':
      return 'O Claude não gerou cartões para este conteúdo.'
    default:
      return 'Não foi possível falar com o Claude agora. Tente de novo.'
  }
}
