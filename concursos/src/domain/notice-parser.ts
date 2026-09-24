import type { NoticeImportSubject, Sphere } from './types'

/**
 * Leitura do conteúdo programático de editais.
 *
 * Entrada: texto extraído de um PDF (edital inteiro) ou colado pelo usuário.
 * Etapas:
 *   1. `findSyllabusSection` localiza a seção de conteúdos ("Objetos de
 *      avaliação", "Conteúdo programático"…) e descarta o resto do edital;
 *   2. `parseSyllabus` reconhece disciplinas, assuntos e subitens nos formatos
 *      mais comuns das bancas;
 *   3. `toImportSubjects` converte o resultado no formato de importação,
 *      escolhendo se os subitens viram assuntos ou detalhes do assunto.
 *
 * Formatos reconhecidos (podem ser misturados):
 *   LÍNGUA PORTUGUESA: 1 Compreensão de textos. 2 Ortografia. 4.1 Subitem.   (Cebraspe)
 *   LÍNGUA PORTUGUESA (peso 2, 20 questões): 1. Item. 2) Item.               (FGV, FCC, Vunesp…)
 *   LÍNGUA PORTUGUESA            ← título sozinho na linha, itens abaixo
 *   Direito Tributário:          ← título com dois-pontos, itens em lista (-, •)
 */

export interface ParsedTopic {
  name: string
  /** Subitens do edital (ex.: 4.1, 4.2) */
  details: string[]
}

export interface ParsedSubject {
  name: string
  weight: number | null
  questionCount: number | null
  /** Grupo do edital em que a disciplina aparece (ex.: "Bloco I", "Conhecimentos básicos") */
  group: string | null
  topics: ParsedTopic[]
}

export type Granularity = 'topics' | 'subtopics'

/* -------------------------------------------------------------------------- */
/* Utilitários de texto                                                       */
/* -------------------------------------------------------------------------- */

const UPPER = 'A-ZÀ-ÖØ-Þ'
const letters = (text: string) => text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '')

function isMostlyUppercase(text: string): boolean {
  const l = letters(text)
  if (l.length < 3) return false
  return l.replace(/[^A-ZÀ-ÖØ-Þ]/g, '').length / l.length >= 0.75
}

const LOWER_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'à', 'às', 'ao', 'aos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'ou', 'com', 'por'])
const ACRONYMS = new Set(['TI', 'SUS', 'LGPD', 'ICMS', 'ISS', 'IPVA', 'IPTU', 'ITBI', 'ITCMD', 'AFO', 'CF', 'CTN', 'CTB', 'ECA', 'SQL', 'BI', 'ONU', 'OAB', 'PPA', 'LDO', 'LOA', 'LRF', 'SIAFI'])

function capitalize(word: string): string {
  return word
    .split('-')
    .map((part) => part.replace(/^([("“]?)(\p{L})/u, (_, p: string, c: string) => p + c.toUpperCase()))
    .join('-')
}

export function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word, i) => {
      const bare = word.replace(/[^\p{L}]/gu, '')
      if (ACRONYMS.has(bare) || /^[IVXL]+$/.test(bare)) return word
      const lower = word.toLowerCase()
      return i > 0 && LOWER_WORDS.has(lower) ? lower : capitalize(lower)
    })
    .join(' ')
}

function cleanItem(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[\s.;,:–-]+|[\s.;,:]+$/g, '')
    .trim()
}

function parseMeta(meta: string | undefined) {
  const weight = meta?.match(/peso\s*(\d+(?:[.,]\d+)?)/i)?.[1]
  const questions = meta?.match(/(\d+)\s*quest/i)?.[1]
  return {
    weight: weight ? Number(weight.replace(',', '.')) : null,
    questionCount: questions ? Number(questions) : null,
  }
}

/** Grupos que organizam o edital mas não são disciplinas. */
const GROUP_HEADER =
  /^(bloco|grupo|parte|m[óo]dulo|eixo|conhecimentos(\s+(b[áa]sicos|gerais|espec[íi]ficos|complementares|comuns))?$|habilidades$|prova\s+objetiva)\b/i

/* -------------------------------------------------------------------------- */
/* 1. Localizar a seção de conteúdos                                          */
/* -------------------------------------------------------------------------- */

const SECTION_START =
  /^\s*(?:ANEXO\s+[IVXL\d]+\s*[–-]?\s*)?(?:\d+(?:\.\d+)*\s+)?(?:D[OA]S?\s+)?(?:OBJETOS?\s+DE\s+AVALIA|CONTE[ÚU]DOS?\s+PROGRAM[ÁA]TICOS?|CONHECIMENTOS\s+EXIGIDOS|PROGRAMAS?\s+DAS?\s+PROVAS?)/i

export interface SyllabusSection {
  text: string
  /** Título da seção encontrada, quando houver */
  heading: string | null
  /** Índice da linha (no texto completo) onde a seção começa */
  startLine: number
}

/**
 * Localiza a seção de conteúdos do edital. Considera o último título em caixa
 * alta que corresponda (o sumário/preâmbulo costuma citar a seção antes) e
 * termina no próximo ANEXO.
 */
export function findSyllabusSection(fullText: string): SyllabusSection {
  const lines = fullText.split(/\r?\n/)
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length < 120 && SECTION_START.test(line) && isMostlyUppercase(line)) start = i
  }
  if (start < 0) return { text: fullText, heading: null, startLine: 0 }

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*ANEXO\b/.test(lines[i]) && isMostlyUppercase(lines[i])) {
      end = i
      break
    }
  }
  return { text: lines.slice(start + 1, end).join('\n'), heading: lines[start].trim(), startLine: start }
}

/* -------------------------------------------------------------------------- */
/* 2. Reconhecer disciplinas e assuntos                                       */
/* -------------------------------------------------------------------------- */

const CLAUSE_PREFIX = new RegExp(`^\\d+(?:\\.\\d+)*\\s+(?=[${UPPER}])`)

const H = '\u0001' // marcador interno de título
const B = '\u0002' // marcador interno de item de lista

/** Título em caixa alta seguido de dois-pontos no meio do texto (ex.: "… textos. RACIOCÍNIO LÓGICO: 1 …"). */
const WORD = `[("“]?[${UPPER}][${UPPER}0-9ºª'’/–-]*[)"”,]?`
const INLINE_HEADER = new RegExp(`(^|[\\s.;:])((?:${WORD}[ \\t]+){0,14}${WORD})[ \\t]*(\\([^)\\n]{0,60}\\))?[ \\t]*:(?!\\d)`, 'g')

/** Marcadores numerados: "1 ", "1. ", "2) ", "4.1 ", "4.4.1. ", "1 – " */
const MARKER = new RegExp(`(^|\\s)(\\d{1,2}(?:\\.\\d{1,2})*)\\.?\\s*(?:[)–-]\\s*)?\\s(?=[${UPPER}("“])`, 'g')

function looksLikeHeaderName(name: string): boolean {
  const l = letters(name)
  const words = name.trim().split(/\s+/).length
  return l.length >= 5 || (words >= 2 && l.length >= 4)
}

/** Primeira passada, linha a linha: marca títulos e itens de lista e junta as quebras de linha do PDF. */
function linesToStream(text: string): string {
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || /^\d{1,4}$/.test(line)) continue // linhas vazias e números de página

    const bullet = line.match(/^[-•*▪●◦·]\s+(.*)$/)
    if (bullet) {
      out.push(`\n${B}${bullet[1]}\n`)
      continue
    }

    // Título sozinho na linha: "LÍNGUA PORTUGUESA", "BLOCO I", "24.2 CONHECIMENTOS", "Direito Tributário:"
    const withoutClause = line.replace(CLAUSE_PREFIX, '')
    const ownLineColon = line.match(/^(.{2,90}?)\s*(\([^)]*\))?\s*:\s*$/)
    if (ownLineColon && !/^\d/.test(line)) {
      out.push(`\n${H}${ownLineColon[1]}${ownLineColon[2] ? ` ${ownLineColon[2]}` : ''}\n`)
      continue
    }
    if (withoutClause.length <= 90 && !/:/.test(withoutClause) && isMostlyUppercase(withoutClause) && !/^\d/.test(withoutClause)) {
      out.push(`\n${H}${withoutClause}\n`)
      continue
    }
    // Palavra partida no fim da linha ("inter-" + "regional") não ganha espaço
    out.push(/[\p{L}]-$/u.test(line) ? line : `${line} `)
  }

  // Segunda passada: títulos em caixa alta no meio do texto corrido
  return out.join('').replace(INLINE_HEADER, (match, before: string, name: string, meta: string | undefined) => {
    if (!looksLikeHeaderName(name) || !isMostlyUppercase(name)) return match
    return `${before}\n${H}${name}${meta ? ` ${meta}` : ''}\n`
  })
}

interface Marker {
  index: number
  length: number
  parts: number[]
}

/** Divide o corpo de uma disciplina em itens numerados, validando a sequência (1, 2, 3…; 4.1 só dentro do 4). */
function splitNumbered(body: string): ParsedTopic[] | null {
  const markers: Marker[] = []
  let top = 0
  for (const m of body.matchAll(MARKER)) {
    const parts = m[2].split('.').map(Number)
    const index = m.index! + m[1].length
    if (parts.length === 1) {
      if (parts[0] !== top + 1) continue
      top = parts[0]
    } else if (parts[0] !== top || top === 0) {
      continue
    }
    markers.push({ index, length: m[0].length - m[1].length, parts })
  }
  if (!markers.some((m) => m.parts.length === 1)) return null

  const topics: ParsedTopic[] = []
  markers.forEach((marker, i) => {
    const text = cleanItem(body.slice(marker.index + marker.length, markers[i + 1]?.index ?? body.length))
    if (!text) return
    if (marker.parts.length === 1) topics.push({ name: text, details: [] })
    else topics.at(-1)?.details.push(text)
  })
  return topics
}

function splitBody(body: string): ParsedTopic[] {
  const [lead, ...bullets] = body.split(B)
  if (bullets.length > 0) {
    const items = [...splitSimple(lead), ...bullets.flatMap((b) => splitNumbered(b) ?? [{ name: cleanItem(b), details: [] }])]
    return items.filter((t) => t.name.length > 1)
  }
  return splitNumbered(body) ?? splitSimple(body)
}

/** Corpo sem numeração: lista separada por ";" ou um único assunto curto. Texto corrido longo é descartado. */
function splitSimple(body: string): ParsedTopic[] {
  const text = cleanItem(body)
  if (!text) return []
  const parts = text.split(/\s*;\s*/).map(cleanItem).filter(Boolean)
  if (parts.length >= 2 && parts.every((p) => p.length <= 140)) return parts.map((name) => ({ name, details: [] }))
  return text.length <= 160 ? [{ name: text, details: [] }] : []
}

function cleanHeaderName(raw: string): { name: string; meta?: string } {
  const meta = raw.match(/\(([^)]*(?:peso|quest)[^)]*)\)/i)
  let name = (meta ? raw.replace(meta[0], '') : raw).trim()
  name = name.replace(/^(?:[IVXL]{1,4}|\d{1,2}(?:\.\d+)*)[.)–-]?\s+(?=\S)/, '').replace(/[\s:–-]+$/, '')
  return { name: isMostlyUppercase(name) ? titleCase(name) : name, meta: meta?.[1] }
}

export function parseSyllabus(text: string): ParsedSubject[] {
  const stream = linesToStream(text)
  const segments = stream.split(H).slice(1)
  // Texto antes do primeiro título (sem título) é ignorado.
  const subjects: ParsedSubject[] = []
  let group: string | null = null

  for (const segment of segments) {
    const newline = segment.indexOf('\n')
    const header = newline < 0 ? segment : segment.slice(0, newline)
    const body = newline < 0 ? '' : segment.slice(newline + 1)
    const { name, meta } = cleanHeaderName(header)
    if (!name) continue
    // Cláusulas do próprio edital ("24.2.1 Nas provas, serão…") não são assuntos
    const topics = GROUP_HEADER.test(name) ? [] : splitBody(body).filter((t) => !/^\d+\.\d+/.test(t.name))

    if (topics.length === 0) {
      if (GROUP_HEADER.test(name)) group = name
      continue
    }

    const existing = subjects.find((s) => s.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      existing.topics.push(...topics)
      continue
    }
    subjects.push({ name, ...parseMeta(meta), group, topics })
  }

  // Remove assuntos repetidos preservando a ordem
  for (const s of subjects) {
    const seen = new Set<string>()
    s.topics = s.topics.filter((t) => {
      const key = t.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  return subjects
}

/* -------------------------------------------------------------------------- */
/* 3. Converter para o formato de importação                                  */
/* -------------------------------------------------------------------------- */

/**
 * `topics`: cada item principal vira um assunto e os subitens ficam como detalhes.
 * `subtopics`: cada subitem vira um assunto (itens sem subitens continuam como estão).
 */
export function toImportSubjects(subjects: ParsedSubject[], granularity: Granularity): NoticeImportSubject[] {
  return subjects.map((s) => ({
    name: s.name,
    weight: s.weight,
    questionCount: s.questionCount,
    topics:
      granularity === 'topics'
        ? s.topics.map((t) => ({ name: t.name, details: t.details }))
        : s.topics.flatMap((t) =>
            t.details.length === 0
              ? [{ name: t.name, details: [] }]
              : t.details.map((d) => ({
                  // Subitens muito curtos ("Conceito") perdem o sentido sozinhos
                  name: d.length < 28 ? `${t.name}: ${d.charAt(0).toLowerCase()}${d.slice(1)}` : d,
                  details: [],
                })),
          ),
  }))
}

/** Atalho: texto → disciplinas (localiza a seção, reconhece e converte). */
export function parseNoticeSyllabus(text: string, granularity: Granularity = 'topics'): NoticeImportSubject[] {
  return toImportSubjects(parseSyllabus(findSyllabusSection(text).text), granularity)
}

/* -------------------------------------------------------------------------- */
/* Metadados do edital                                                        */
/* -------------------------------------------------------------------------- */

export interface NoticeMetadata {
  organization: string | null
  organizationShort: string | null
  year: number | null
  examBoard: string | null
  sphere: Sphere | null
}

const EXAM_BOARDS: [RegExp, string][] = [
  [/\bcebraspe\b|\bcespe\b/gi, 'Cebraspe'],
  [/\bfunda[çc][ãa]o getulio vargas\b|\bFGV\b/g, 'FGV'],
  [/\bfunda[çc][ãa]o carlos chagas\b|\bFCC\b/g, 'FCC'],
  [/\bvunesp\b/gi, 'Vunesp'],
  [/\bcesgranrio\b/gi, 'Cesgranrio'],
  [/\bIBFC\b/g, 'IBFC'],
  [/\bquadrix\b/gi, 'Quadrix'],
  [/\binstituto aocp\b|\bAOCP\b/g, 'Instituto AOCP'],
  [/\bidecan\b/gi, 'Idecan'],
  [/\bconsulplan\b/gi, 'Consulplan'],
  [/\bfundatec\b/gi, 'Fundatec'],
  [/\biades\b/gi, 'Iades'],
  [/\bfgv conhecimento\b/gi, 'FGV'],
  [/\bcomperve\b/gi, 'Comperve'],
  [/\bfumarc\b/gi, 'Fumarc'],
  [/\bselecon\b/gi, 'Selecon'],
]

/** Extrai órgão, sigla, ano, banca e esfera do cabeçalho e do corpo do edital. */
export function detectNoticeMetadata(fullText: string): NoticeMetadata {
  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\d{1,4}$/.test(l))

  // Órgão: última linha em caixa alta antes da linha "EDITAL"/"CONCURSO"
  const head = lines.slice(0, 15)
  const editalIndex = head.findIndex((l) => /^(EDITAL|CONCURSO|PROCESSO SELETIVO)\b/i.test(l))
  const orgLine = head
    .slice(0, editalIndex > 0 ? editalIndex : 6)
    .filter((l) => isMostlyUppercase(l) && l.length <= 100 && !/^(MINIST[ÉE]RIO|GOVERNO|PODER|REP[ÚU]BLICA)\b/i.test(l))
    .at(-1)
  const organization = orgLine ? titleCase(orgLine) : null

  // Sigla: "POLÍCIA RODOVIÁRIA FEDERAL (PRF)" ou "EDITAL CONCURSO PRF Nº 1"
  let organizationShort: string | null = null
  if (orgLine) {
    const escaped = orgLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    organizationShort = fullText.match(new RegExp(`${escaped}\\s*\\(([A-Z][A-Z0-9/-]{1,11})\\)`, 'i'))?.[1] ?? null
  }
  const editalLine = lines.slice(0, 30).find((l) => /^EDITAL\b/i.test(l))
  // "EDITAL CONCURSO PRF Nº 1" ou "EDITAL Nº 1 – TCU, DE …"
  const notSigla = new Set(['CONCURSO', 'EDITAL', 'ABERTURA', 'PUBLICO', 'PÚBLICO'])
  organizationShort ??=
    [
      editalLine?.match(/\b([A-Z][A-Z0-9/-]{1,11})\s+N[º°o.]/)?.[1],
      editalLine?.match(/N[º°o.]*\s*\d+(?:\/\d+)?\s*[–-]\s*([A-Z][A-Z0-9/-]{1,11})\b/)?.[1],
    ].find((c): c is string => !!c && !notSigla.has(c)) ?? null

  // Ano: o do título do edital; senão o ano mais citado
  const year = Number(editalLine?.match(/\b(19|20)\d{2}\b/)?.[0]) || mostFrequentYear(fullText)

  // Banca: a mais citada
  let examBoard: string | null = null
  let best = 0
  for (const [pattern, name] of EXAM_BOARDS) {
    const count = fullText.match(pattern)?.length ?? 0
    if (count > best) {
      best = count
      examBoard = name
    }
  }

  const headText = lines.slice(0, 8).join(' ')
  const sphere: Sphere | null = /prefeitura|munic[íi]pio|c[âa]mara municipal/i.test(headText)
    ? 'municipal'
    : /estado d[eoa]|secretaria de estado|assembleia legislativa|tribunal de justi[çc]a d/i.test(headText)
      ? 'estadual'
      : /federal|minist[ée]rio|uni[ãa]o|nacional/i.test(headText)
        ? 'federal'
        : null

  return { organization, organizationShort, year: year || null, examBoard, sphere }
}

function mostFrequentYear(text: string): number | null {
  const counts = new Map<string, number>()
  for (const m of text.matchAll(/\b(20[0-3]\d)\b/g)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1)
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]
  return top ? Number(top[0]) : null
}
