// Gera supabase/seed.sql a partir de src/data/seed.ts
// Uso: npx vite-node scripts/gen-seed-sql.ts
import { writeFileSync } from 'node:fs'
import { DEFAULT_SETTINGS, SEED_CASES, SEED_EXECUTIVES, SEED_MODULES } from '../src/data/seed'

const q = (v: unknown) => (typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)

const lines: string[] = ['-- Dados iniciais (gerado por scripts/gen-seed-sql.ts)', '']
lines.push(`insert into settings (id, data) values (1, ${q(JSON.stringify(DEFAULT_SETTINGS))}::jsonb) on conflict (id) do nothing;`, '')
for (const e of SEED_EXECUTIVES)
  lines.push(`insert into executives (id, name, email, phone, whatsapp, role, photo, active) values (${[e.id, e.name, e.email, e.phone, e.whatsapp, e.role, e.photo, e.active].map(q).join(', ')}) on conflict (id) do nothing;`)
lines.push('')
for (const m of SEED_MODULES)
  lines.push(`insert into modules (id, name, description, category, default_price, active, sort_order) values (${[m.id, m.name, m.description, m.category, m.defaultPrice, m.active, m.sortOrder].map(q).join(', ')}) on conflict (id) do nothing;`)
lines.push('')
for (const c of SEED_CASES) {
  const mm = [0, 1, 2, 3].flatMap((i) => [c.metrics[i]?.name ?? '', c.metrics[i]?.value ?? ''])
  lines.push(
    `insert into cases (id, name, company, segment, location, headline, description, logo, image, metric_1_name, metric_1_value, metric_2_name, metric_2_value, metric_3_name, metric_3_value, metric_4_name, metric_4_value, active) values (${[c.id, c.name, c.company, c.segment, c.location, c.headline, c.description, c.logo, c.image, ...mm, c.active].map(q).join(', ')}) on conflict (id) do nothing;`,
  )
}
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), lines.join('\n') + '\n')
console.log('supabase/seed.sql gerado')
