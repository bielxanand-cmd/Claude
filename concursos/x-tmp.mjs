import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const data = new Uint8Array(readFileSync(process.argv[2]))
const doc = await getDocument({ data }).promise
let out = ''
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i)
  const c = await page.getTextContent()
  let line = ''
  for (const it of c.items) { line += it.str; if (it.hasEOL) { out += line + '\n'; line = '' } }
  out += line + `\n<<<PAGE ${i}>>>\n`
}
writeFileSync(process.argv[3], out)
console.log(doc.numPages, out.length)
