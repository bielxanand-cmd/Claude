import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import { generateSeedSql } from '../scripts/generate-seed-sql'
import { buildSeedRows } from '../src/data/seed'

/** Aplica as migrations e o seed num Postgres embutido para validar o SQL. */
describe('schema do Supabase', () => {
  it('aplica migrations + seed e calcula frequências coerentes', { timeout: 30_000 }, async () => {
    const db = new PGlite()
    const dir = resolve(import.meta.dirname, 'migrations')
    for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(resolve(dir, file), 'utf8'))

    const seedSql = generateSeedSql()
    expect(readFileSync(resolve(import.meta.dirname, 'seed.sql'), 'utf8')).toBe(seedSql)
    await db.exec(seedSql)

    const rows = buildSeedRows()
    const count = async (table: string) => (await db.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0].n
    expect(await count('careers')).toBe(rows.careers.length)
    expect(await count('topics')).toBe(rows.topics.length)
    expect(await count('contest_topics')).toBe(rows.contestTopics.length)

    const freq = await db.query<{ frequency: string; contest_count: number }>(
      `select frequency, contest_count from position_topic_frequency
       where position_id = 'auditor-fiscal-estadual' and topic_id = 'direito-tributario__competencia-tributaria'`,
    )
    expect(freq.rows[0]).toEqual({ frequency: '1.0000', contest_count: 5 })

    const user = await db.query<{ id: string }>(`insert into users (name) values ('Teste') returning id`)
    await db.query(`insert into summaries (user_id, topic_id, content, plain_text) values ($1, 'crase', '{}', 'x')`, [user.rows[0].id]).catch((e) => {
      expect(String(e)).toMatch(/foreign key/)
    })
  })
})
