/**
 * Gera `dist-artifact/aprova.html`: a versão de demonstração em um único
 * arquivo (JS e CSS embutidos), sem backend e com navegação em memória.
 * Uso: `npm run build:artifact`.
 */
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
execSync('npx vite build --mode artifact', { cwd: root, stdio: 'inherit' })

const assets = resolve(root, 'dist-artifact/assets')
const files = readdirSync(assets)
const js = files.filter((f) => f.endsWith('.js'))
const css = files.filter((f) => f.endsWith('.css'))
if (js.length !== 1) throw new Error(`Esperado 1 bundle JS, encontrados: ${js.join(', ')}`)

const script = readFileSync(resolve(assets, js[0]), 'utf8').replace(/<\/script/gi, '<\\/script')
const style = css.map((f) => readFileSync(resolve(assets, f), 'utf8')).join('\n').replace(/<\/style/gi, '<\\/style')
const favicon = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8')

const html = `<title>Aprova Concursos</title>
<meta name="description" content="Organize seus estudos para concursos públicos: disciplinas e assuntos consolidados a partir de editais anteriores, resumos e progresso." />
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(favicon)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<script>
  try {
    const t = localStorage.getItem('concursos.theme') || 'system'
    const h = document.documentElement.dataset.theme
    const dark = t === 'dark' || (t === 'system' && (h ? h === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches))
    if (dark) document.documentElement.classList.add('dark')
  } catch {}
</script>
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`
const out = resolve(root, 'dist-artifact/aprova.html')
writeFileSync(out, html)
console.log(`\n${out} (${(html.length / 1024).toFixed(0)} KB)`)
