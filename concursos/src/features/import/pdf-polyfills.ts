/**
 * Polyfills mínimos exigidos pelo pdf.js e ausentes no Safari:
 * Promise.withResolvers (Safari < 17.4) e iteração de ReadableStream com
 * `for await` (não suportada pelo Safari).
 */
export function installPdfPolyfills() {
  const proto = (typeof ReadableStream !== 'undefined' ? ReadableStream.prototype : {}) as unknown as Record<symbol, unknown>
  proto[Symbol.asyncIterator] ??= async function* (this: ReadableStream) {
    const reader = this.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return
        yield value
      }
    } finally {
      reader.releaseLock()
    }
  }

  const P = Promise as unknown as { withResolvers?: () => unknown }
  P.withResolvers ??= function withResolvers<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
