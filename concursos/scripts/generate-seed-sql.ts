/**
 * Gera `supabase/seed.sql` a partir do seed TypeScript (fonte única da verdade
 * para os dados demonstrativos). Uso: `npm run db:seed-sql`.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildSeedRows } from '../src/data/seed'
import { BRAZIL_STATES } from '../src/lib/states'

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `'{${v.join(',')}}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

function insert(table: string, columns: string[], rows: unknown[][]): string {
  if (rows.length === 0) return ''
  const values = rows.map((r) => `  (${r.map(q).join(', ')})`).join(',\n')
  return `insert into public.${table} (${columns.join(', ')}) values\n${values}\non conflict do nothing;\n\n`
}

export function generateSeedSql(): string {
  const rows = buildSeedRows()
  let sql = `-- Gerado automaticamente por scripts/generate-seed-sql.ts — não edite à mão.
-- DADOS DEMONSTRATIVOS: os editais abaixo (origin = 'demo') são ilustrativos e
-- não reproduzem editais oficiais.

`
  sql += insert('regions', ['id', 'type', 'state', 'name'], [
    ['BR', 'federal', null, 'Brasil'],
    ...BRAZIL_STATES.map((s) => [s.uf, 'estadual', s.uf, s.name]),
  ])
  sql += insert('careers', ['id', 'slug', 'name', 'description', 'icon'], rows.careers.map((c) => [c.id, c.slug, c.name, c.description, c.icon]))
  sql += insert('positions', ['id', 'career_id', 'name', 'description', 'spheres'], rows.positions.map((p) => [p.id, p.careerId, p.name, p.description, p.spheres]))
  sql += insert('subjects', ['id', 'slug', 'name', 'icon'], rows.subjects.map((s) => [s.id, s.slug, s.name, s.icon]))
  sql += insert('topics', ['id', 'subject_id', 'name', 'sort_order'], rows.topics.map((t) => [t.id, t.subjectId, t.name, t.order]))
  sql += insert(
    'contests',
    ['id', 'position_id', 'name', 'organization', 'organization_short', 'sphere', 'state', 'city', 'year', 'notice_url', 'notice_date', 'origin'],
    rows.contests.map((c) => [c.id, c.positionId, c.name, c.organization, c.organizationShort, c.sphere, c.state, c.city, c.year, c.noticeUrl, c.noticeDate, c.origin]),
  )
  sql += insert('contest_subjects', ['contest_id', 'subject_id', 'weight', 'question_count'], rows.contestSubjects.map((cs) => [cs.contestId, cs.subjectId, cs.weight, cs.questionCount]))
  sql += insert('contest_topics', ['contest_id', 'topic_id'], rows.contestTopics.map((ct) => [ct.contestId, ct.topicId]))
  return sql
}

if (process.argv[1]?.endsWith('generate-seed-sql.ts')) {
  const out = resolve(import.meta.dirname, '../supabase/seed.sql')
  writeFileSync(out, generateSeedSql())
  console.log(`seed gerado em ${out}`)
}
