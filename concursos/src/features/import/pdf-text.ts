/**
 * Extração do texto de um PDF no próprio navegador (pdf.js), sem servidor.
 *
 * - Usa o build "legacy" do pdf.js, que inclui polyfills: o build moderno
 *   exige recursos recentes (Map.getOrInsertComputed, Uint8Array.toBase64…)
 *   ausentes no Safari e em versões não tão novas do Chrome/Firefox.
 * - Tenta ler num Web Worker; se o ambiente não permitir (ex.: página
 *   publicada com política de segurança restrita), lê na própria página.
 * - A biblioteca só é carregada quando o usuário envia um arquivo.
 */
export interface PdfText {
  /** Texto de cada página, com quebras de linha preservadas */
  pages: string[]
}

export class PdfReadError extends Error {
  readonly reason: 'invalid' | 'password' | 'no-text' | 'unsupported'
  constructor(message: string, reason: PdfReadError['reason']) {
    super(message)
    this.reason = reason
  }
}

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
type PdfWorkerInstance = InstanceType<PdfJs['PDFWorker']>

const WORKER_TIMEOUT = 5000

/** Polyfill mínimo: o pdf.js exige Promise.withResolvers (Safari < 17.4, Chrome < 119). */
function polyfill() {
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

let pdfjsPromise: Promise<PdfJs> | null = null
const loadPdfJs = () => {
  polyfill()
  return (pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs'))
}

/**
 * Worker dedicado, confirmado: espera a mensagem "ready" que o worker do
 * pdf.js envia ao iniciar. Sem essa confirmação, um worker bloqueado pela
 * política de segurança da página faria a leitura esperar para sempre.
 * Retorna `null` quando o ambiente não permite workers.
 */
async function createWorker(pdfjs: PdfJs): Promise<PdfWorkerInstance | null> {
  if (import.meta.env.VITE_PDF_MAIN_THREAD === 'true' || typeof Worker === 'undefined') return null
  let port: Worker | null = null
  try {
    const { default: PdfWorker } = await import('pdfjs-dist/legacy/build/pdf.worker.mjs?worker&inline')
    port = new PdfWorker()
    const worker = port
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('worker não respondeu')), WORKER_TIMEOUT)
      worker.addEventListener('message', () => (clearTimeout(timer), resolve()), { once: true })
      worker.addEventListener('error', (e) => (clearTimeout(timer), reject(new Error(e.message || 'erro no worker'))), { once: true })
    })
    // A tipagem do pdf.js declara `port` como null, mas a API aceita um Worker
    return new pdfjs.PDFWorker({ port } as unknown as ConstructorParameters<PdfJs['PDFWorker']>[0])
  } catch (err) {
    port?.terminate()
    console.warn('[pdf] worker indisponível, lendo na página principal', err)
    return null
  }
}

/** Leitura na página principal: o pdf.js usa o módulo do worker diretamente. */
async function enableMainThread() {
  const g = globalThis as { pdfjsWorker?: unknown }
  g.pdfjsWorker ??= await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
}

async function openDocument(pdfjs: PdfJs, data: Uint8Array) {
  const worker = await createWorker(pdfjs)
  if (!worker) await enableMainThread()
  // O pdf.js transfere o buffer para o worker; guardamos uma cópia para a nova tentativa
  const retryData = worker ? data.slice() : data
  const task = pdfjs.getDocument({ data, ...(worker ? { worker } : {}) })
  try {
    return { task, doc: await task.promise }
  } catch (err) {
    if (!worker || (err instanceof Error && err.name === 'PasswordException')) throw err
    // Worker criado mas falhou ao processar: tenta de novo na página principal
    void task.destroy()
    worker.destroy()
    await enableMainThread()
    const retry = pdfjs.getDocument({ data: retryData })
    return { task: retry, doc: await retry.promise }
  }
}

function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  return String(err)
}

export async function extractPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<PdfText> {
  let pdfjs: PdfJs
  try {
    pdfjs = await loadPdfJs()
  } catch (err) {
    throw new PdfReadError(`Seu navegador não conseguiu carregar o leitor de PDF (${describe(err)}). Use “Colar texto”.`, 'unsupported')
  }

  const data = new Uint8Array(await file.arrayBuffer())
  let opened: Awaited<ReturnType<typeof openDocument>>
  try {
    opened = await openDocument(pdfjs, data)
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') throw new PdfReadError('O PDF está protegido por senha.', 'password')
    if (err instanceof Error && /InvalidPDF|FormatError/i.test(`${err.name} ${err.message}`))
      throw new PdfReadError('O arquivo não parece ser um PDF válido.', 'invalid')
    throw new PdfReadError(`Não foi possível abrir o PDF (${describe(err)}).`, 'unsupported')
  }

  const { task, doc } = opened
  const pages: string[] = []
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      let text = ''
      for (const item of content.items) {
        if (!('str' in item)) continue
        text += item.str
        if (item.hasEOL) text += '\n'
      }
      pages.push(text)
      page.cleanup()
      onProgress?.(i, doc.numPages)
    }
  } finally {
    void task.destroy()
  }

  const chars = pages.join('').replace(/\s/g, '').length
  if (chars < 50 * pages.length && chars < 2000)
    throw new PdfReadError('Este PDF parece ser uma imagem escaneada, sem texto selecionável. Cole o conteúdo programático como texto.', 'no-text')
  return { pages }
}
