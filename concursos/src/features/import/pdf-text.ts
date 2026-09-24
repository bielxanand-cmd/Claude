/**
 * Extração do texto de um PDF no próprio navegador (pdf.js), sem servidor.
 * A biblioteca é carregada só quando o usuário envia um arquivo.
 */
export interface PdfText {
  /** Texto de cada página, com quebras de linha preservadas */
  pages: string[]
}

export class PdfReadError extends Error {
  readonly reason: 'invalid' | 'password' | 'no-text'
  constructor(message: string, reason: PdfReadError['reason']) {
    super(message)
    this.reason = reason
  }
}

export async function extractPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<PdfText> {
  const [pdfjs, { default: PdfWorker }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?worker&inline'),
  ])
  pdfjs.GlobalWorkerOptions.workerPort ??= new PdfWorker()

  let doc
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') throw new PdfReadError('O PDF está protegido por senha.', 'password')
    throw new PdfReadError('Não foi possível abrir o arquivo. Verifique se é um PDF válido.', 'invalid')
  }

  const pages: string[] = []
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
    onProgress?.(i, doc.numPages)
  }
  await doc.cleanup()

  const chars = pages.join('').replace(/\s/g, '').length
  if (chars < 50 * pages.length && chars < 2000)
    throw new PdfReadError('Este PDF parece ser uma imagem escaneada, sem texto selecionável. Cole o conteúdo programático como texto.', 'no-text')
  return { pages }
}
