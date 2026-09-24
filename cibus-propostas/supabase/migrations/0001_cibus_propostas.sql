-- Cibus Propostas — esquema inicial
-- Execute no SQL Editor do Supabase (ou via `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Bibliotecas (administração)
-- ---------------------------------------------------------------------------

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists executives (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  role text not null default '',
  photo text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists modules (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text not null default '',
  category text not null default 'Fidelidade',
  default_price numeric(12,2) not null default 0,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cases (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  company text not null default '',
  segment text not null default '',
  location text not null default '',
  headline text not null default '',
  description text not null default '',
  logo text not null default '',
  image text not null default '',
  metric_1_name text not null default '', metric_1_value text not null default '',
  metric_2_name text not null default '', metric_2_value text not null default '',
  metric_3_name text not null default '', metric_3_value text not null default '',
  metric_4_name text not null default '', metric_4_value text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Propostas
-- ---------------------------------------------------------------------------

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft','review','sent','approved','lost')),
  template_id text not null default 'cibus-default',
  client_name text not null default '',
  company_name text not null default '',
  cnpj text not null default '',
  city text not null default '',
  state text not null default '',
  segment text not null default '',
  stations int not null default 1,
  cnpjs int not null default 1,
  contact_role text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  client_logo text not null default '',
  title text not null default '',
  product text not null default '',
  proposal_date date,
  valid_until text not null default '',
  executive_id text references executives(id) on delete set null,
  executive jsonb not null default '{}'::jsonb,
  cover_title text not null default '',
  cover_subtitle text not null default '',
  cover_image text not null default '',
  cases_title text not null default '',
  cases_subtitle text not null default '',
  roi jsonb not null default '{}'::jsonb,
  closing jsonb not null default '{}'::jsonb,
  sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposal_scenarios (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references proposals(id) on delete cascade,
  title text not null default '',
  subtitle text not null default '',
  current_operation text not null default '',
  body text not null default '',
  challenges jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb
);

create table if not exists proposal_projects (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references proposals(id) on delete cascade,
  title text not null default '',
  subtitle text not null default '',
  objective text not null default '',
  strategy text not null default '',
  description text not null default '', -- "Como o Cibus ajuda"
  module_ids jsonb not null default '[]'::jsonb
);

create table if not exists proposal_modules (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  module_id text references modules(id) on delete set null,
  name text not null,
  description text not null default '',
  table_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  final_price numeric(12,2) not null default 0,
  included boolean not null default false,
  sort_order int not null default 0
);
create index if not exists proposal_modules_proposal_idx on proposal_modules(proposal_id);

create table if not exists proposal_investments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references proposals(id) on delete cascade,
  stations int not null default 1,
  implementation_price numeric(12,2) not null default 0,
  implementation_discount_type text not null default 'fixed',
  implementation_discount_value numeric(12,2) not null default 0,
  implementation_discount numeric(12,2) not null default 0,
  implementation_final numeric(12,2) not null default 0,
  implementation_free boolean not null default false,
  monthly_price numeric(12,2) not null default 0,
  monthly_discount_type text not null default 'fixed',
  monthly_discount_value numeric(12,2) not null default 0,
  monthly_discount numeric(12,2) not null default 0,
  monthly_final numeric(12,2) not null default 0,
  custom_discounts jsonb not null default '[]'::jsonb,
  consumption jsonb not null default '[]'::jsonb,
  note text not null default ''
);

create table if not exists proposal_cases (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  "order" int not null default 0
);
create index if not exists proposal_cases_proposal_idx on proposal_cases(proposal_id);

-- ---------------------------------------------------------------------------
-- Salvamento atômico de uma proposta completa (uma chamada RPC)
-- ---------------------------------------------------------------------------

create or replace function save_proposal(p jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  pid uuid := (p->>'id')::uuid;
begin
  insert into proposals as t (
    id, status, template_id, client_name, company_name, cnpj, city, state, segment, stations, cnpjs,
    contact_role, contact_email, contact_phone, client_logo, title, product, proposal_date, valid_until,
    executive_id, executive, cover_title, cover_subtitle, cover_image, cases_title, cases_subtitle,
    roi, closing, sections, created_at, updated_at
  ) values (
    pid, p->>'status', p->>'template_id', p->>'client_name', p->>'company_name', p->>'cnpj', p->>'city',
    p->>'state', p->>'segment', (p->>'stations')::int, (p->>'cnpjs')::int, p->>'contact_role',
    p->>'contact_email', p->>'contact_phone', p->>'client_logo', p->>'title', p->>'product',
    nullif(p->>'proposal_date','')::date, p->>'valid_until', nullif(p->>'executive_id',''), p->'executive',
    p->>'cover_title', p->>'cover_subtitle', p->>'cover_image', p->>'cases_title', p->>'cases_subtitle',
    p->'roi', p->'closing', p->'sections', coalesce((p->>'created_at')::timestamptz, now()), now()
  )
  on conflict (id) do update set
    status = excluded.status, template_id = excluded.template_id, client_name = excluded.client_name,
    company_name = excluded.company_name, cnpj = excluded.cnpj, city = excluded.city, state = excluded.state,
    segment = excluded.segment, stations = excluded.stations, cnpjs = excluded.cnpjs,
    contact_role = excluded.contact_role, contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone, client_logo = excluded.client_logo, title = excluded.title,
    product = excluded.product, proposal_date = excluded.proposal_date, valid_until = excluded.valid_until,
    executive_id = excluded.executive_id, executive = excluded.executive, cover_title = excluded.cover_title,
    cover_subtitle = excluded.cover_subtitle, cover_image = excluded.cover_image,
    cases_title = excluded.cases_title, cases_subtitle = excluded.cases_subtitle, roi = excluded.roi,
    closing = excluded.closing, sections = excluded.sections, updated_at = now();

  insert into proposal_scenarios (proposal_id, title, subtitle, current_operation, body, challenges, opportunities)
  select pid, s->>'title', s->>'subtitle', s->>'current_operation', s->>'body', s->'challenges', s->'opportunities'
  from (select p->'scenario' as s) x
  on conflict (proposal_id) do update set
    title = excluded.title, subtitle = excluded.subtitle, current_operation = excluded.current_operation,
    body = excluded.body, challenges = excluded.challenges, opportunities = excluded.opportunities;

  insert into proposal_projects (proposal_id, title, subtitle, objective, strategy, description, module_ids)
  select pid, s->>'title', s->>'subtitle', s->>'objective', s->>'strategy', s->>'description', s->'module_ids'
  from (select p->'project' as s) x
  on conflict (proposal_id) do update set
    title = excluded.title, subtitle = excluded.subtitle, objective = excluded.objective,
    strategy = excluded.strategy, description = excluded.description, module_ids = excluded.module_ids;

  insert into proposal_investments (
    proposal_id, stations, implementation_price, implementation_discount_type, implementation_discount_value,
    implementation_discount, implementation_final, implementation_free, monthly_price, monthly_discount_type,
    monthly_discount_value, monthly_discount, monthly_final, custom_discounts, consumption, note
  )
  select pid, (s->>'stations')::int, (s->>'implementation_price')::numeric, s->>'implementation_discount_type',
    (s->>'implementation_discount_value')::numeric, (s->>'implementation_discount')::numeric,
    (s->>'implementation_final')::numeric, (s->>'implementation_free')::boolean, (s->>'monthly_price')::numeric,
    s->>'monthly_discount_type', (s->>'monthly_discount_value')::numeric, (s->>'monthly_discount')::numeric,
    (s->>'monthly_final')::numeric, s->'custom_discounts', s->'consumption', s->>'note'
  from (select p->'investment' as s) x
  on conflict (proposal_id) do update set
    stations = excluded.stations, implementation_price = excluded.implementation_price,
    implementation_discount_type = excluded.implementation_discount_type,
    implementation_discount_value = excluded.implementation_discount_value,
    implementation_discount = excluded.implementation_discount, implementation_final = excluded.implementation_final,
    implementation_free = excluded.implementation_free, monthly_price = excluded.monthly_price,
    monthly_discount_type = excluded.monthly_discount_type, monthly_discount_value = excluded.monthly_discount_value,
    monthly_discount = excluded.monthly_discount, monthly_final = excluded.monthly_final,
    custom_discounts = excluded.custom_discounts, consumption = excluded.consumption, note = excluded.note;

  delete from proposal_modules where proposal_id = pid;
  insert into proposal_modules (id, proposal_id, module_id, name, description, table_price, discount, final_price, included, sort_order)
  select (m->>'id')::uuid, pid, nullif(m->>'module_id',''), m->>'name', m->>'description',
    (m->>'table_price')::numeric, (m->>'discount')::numeric, (m->>'final_price')::numeric,
    (m->>'included')::boolean, (ord - 1)::int
  from jsonb_array_elements(p->'modules') with ordinality as t(m, ord);

  delete from proposal_cases where proposal_id = pid;
  insert into proposal_cases (proposal_id, case_id, "order")
  select pid, c #>> '{}', (ord - 1)::int
  from jsonb_array_elements(p->'case_ids') with ordinality as t(c, ord);
end;
$$;

-- ---------------------------------------------------------------------------
-- Segurança: somente usuários autenticados (crie os usuários em Authentication)
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['settings','executives','modules','cases','proposals','proposal_scenarios',
    'proposal_projects','proposal_modules','proposal_investments','proposal_cases']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "authenticated full access" on %I', t);
    execute format('create policy "authenticated full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Imagens (logos, capas, fotos, cases)
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

drop policy if exists "assets upload" on storage.objects;
create policy "assets upload" on storage.objects for insert to authenticated with check (bucket_id = 'assets');
drop policy if exists "assets update" on storage.objects;
create policy "assets update" on storage.objects for update to authenticated using (bucket_id = 'assets');
