-- =============================================================================
-- Estudos para Concursos — schema inicial
--
-- Catálogo (compartilhado):  careers → positions → contests (editais)
--                             subjects → topics
--                             contest_subjects / contest_topics  (o que cada edital cobrou)
-- Dados do usuário:           users → user_positions, user_topics, summaries
-- Preparado para o futuro:    exam_boards, questions, question_attempts,
--                             flashcards, ai_generations
--
-- IDs do catálogo são `text` para permitir chaves legíveis/estáveis no seed
-- (ex.: 'direito-tributario'); novos registros recebem um UUID em texto.
-- =============================================================================

-- gen_random_uuid() é nativo no Postgres 13+ (Supabase usa 15+).

create type public.sphere as enum ('federal', 'estadual', 'municipal');
create type public.topic_status as enum ('not_started', 'in_progress', 'completed');
create type public.notice_origin as enum ('demo', 'curated', 'import', 'pdf', 'api', 'manual');

-- -----------------------------------------------------------------------------
-- Usuários
-- Enquanto não há autenticação, o app cria um usuário anônimo (id guardado no
-- navegador). Ao ativar o Supabase Auth, basta que `users.id` = `auth.uid()`
-- e trocar as políticas "prototype_*" pelas políticas comentadas no fim.
-- -----------------------------------------------------------------------------
create table public.users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  email       text unique,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------
create table public.careers (
  id          text primary key default gen_random_uuid()::text,
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  icon        text not null default 'layers',
  is_custom   boolean not null default false,
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Regiões: 'BR' (federal) + unidades federativas.
create table public.regions (
  id     text primary key,          -- 'BR', 'SP', 'MG', ...
  type   public.sphere not null,    -- federal | estadual
  state  char(2),                   -- UF (null para federal)
  name   text not null
);

create table public.positions (
  id          text primary key default gen_random_uuid()::text,
  career_id   text not null references public.careers (id) on delete cascade,
  name        text not null,
  description text not null default '',
  spheres     public.sphere[] not null default '{}',
  is_custom   boolean not null default false,
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index positions_career_idx on public.positions (career_id);

-- Bancas examinadoras (usado por editais e, no futuro, por questões)
create table public.exam_boards (
  id    text primary key default gen_random_uuid()::text,
  name  text not null unique
);

-- Concursos / editais anteriores de um cargo
create table public.contests (
  id                 text primary key default gen_random_uuid()::text,
  position_id        text not null references public.positions (id) on delete cascade,
  name               text not null,
  organization       text not null,
  organization_short text not null,
  sphere             public.sphere not null,
  state              char(2),
  city               text,
  federal            boolean generated always as (sphere = 'federal') stored,
  year               int,
  exam_board_id      text references public.exam_boards (id) on delete set null,
  notice_url         text,
  notice_date        date,
  origin             public.notice_origin not null default 'curated',
  source_file_path   text,             -- PDF no Storage (importação futura)
  raw_syllabus       text,             -- texto original do conteúdo programático
  created_by         uuid references public.users (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index contests_position_idx on public.contests (position_id);

create table public.subjects (
  id          text primary key default gen_random_uuid()::text,
  slug        text not null,
  name        text not null,
  icon        text not null default 'book-open',
  created_at  timestamptz not null default now()
);
create unique index subjects_name_key on public.subjects (lower(name));

create table public.topics (
  id          text primary key default gen_random_uuid()::text,
  subject_id  text not null references public.subjects (id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index topics_subject_idx on public.topics (subject_id);

-- Disciplinas cobradas em cada edital
create table public.contest_subjects (
  id              uuid primary key default gen_random_uuid(),
  contest_id      text not null references public.contests (id) on delete cascade,
  subject_id      text not null references public.subjects (id) on delete cascade,
  weight          numeric(5, 2),
  question_count  int,
  unique (contest_id, subject_id)
);

-- Assuntos cobrados em cada edital
create table public.contest_topics (
  id          uuid primary key default gen_random_uuid(),
  contest_id  text not null references public.contests (id) on delete cascade,
  topic_id    text not null references public.topics (id) on delete cascade,
  unique (contest_id, topic_id)
);
create index contest_topics_topic_idx on public.contest_topics (topic_id);

-- Frequência de cada assunto nos editais de um cargo (calculada, nunca digitada)
create view public.position_topic_frequency as
select
  c.position_id,
  ct.topic_id,
  count(distinct ct.contest_id)                                   as contest_count,
  (select count(*) from public.contests c2 where c2.position_id = c.position_id) as total_contests,
  round(count(distinct ct.contest_id)::numeric
        / nullif((select count(*) from public.contests c2 where c2.position_id = c.position_id), 0), 4) as frequency,
  array_agg(distinct ct.contest_id)                               as contest_ids
from public.contest_topics ct
join public.contests c on c.id = ct.contest_id
group by c.position_id, ct.topic_id;

-- -----------------------------------------------------------------------------
-- Dados do usuário
-- -----------------------------------------------------------------------------
create table public.user_positions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  position_id  text not null references public.positions (id) on delete cascade,
  sphere       public.sphere not null,
  state        char(2),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create unique index user_positions_one_active on public.user_positions (user_id) where is_active;

create table public.user_topics (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  topic_id          text not null references public.topics (id) on delete cascade,
  status            public.topic_status not null default 'not_started',
  last_studied_at   timestamptz,
  completed_at      timestamptz,
  last_accessed_at  timestamptz,
  updated_at        timestamptz not null default now(),
  unique (user_id, topic_id)
);

-- Resumo do usuário por assunto. `content` guarda as seções em HTML:
-- { "summary": "...", "keyPoints": "...", "pitfalls": "...", "notes": "..." }
create table public.summaries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  topic_id    text not null references public.topics (id) on delete cascade,
  content     jsonb not null default '{}'::jsonb,
  plain_text  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, topic_id)
);
create index summaries_search_idx on public.summaries using gin (to_tsvector('portuguese', plain_text));

-- -----------------------------------------------------------------------------
-- Futuro: questões, flashcards e IA (tabelas prontas, ainda sem uso na UI)
-- -----------------------------------------------------------------------------
create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  topic_id       text references public.topics (id) on delete set null,
  subject_id     text references public.subjects (id) on delete set null,
  contest_id     text references public.contests (id) on delete set null,
  exam_board_id  text references public.exam_boards (id) on delete set null,
  year           int,
  statement      text not null,
  options        jsonb not null default '[]'::jsonb,  -- [{ "key": "A", "text": "..." }]
  correct_option text,
  explanation    text,
  origin         public.notice_origin not null default 'curated',
  created_at     timestamptz not null default now()
);
create index questions_topic_idx on public.questions (topic_id);
create index questions_subject_idx on public.questions (subject_id);

create table public.question_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  question_id  uuid not null references public.questions (id) on delete cascade,
  selected     text,
  is_correct   boolean not null,
  answered_at  timestamptz not null default now()
);
create index question_attempts_user_idx on public.question_attempts (user_id, answered_at desc);

create table public.flashcards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  topic_id       text not null references public.topics (id) on delete cascade,
  front          text not null,
  back           text not null,
  -- revisão espaçada (SM-2)
  ease_factor    numeric(4, 2) not null default 2.5,
  interval_days  int not null default 0,
  due_at         timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create table public.ai_generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  topic_id    text references public.topics (id) on delete set null,
  kind        text not null,       -- summarize | questions | flashcards | explain | mind_map
  input       jsonb not null default '{}'::jsonb,
  output      jsonb,
  model       text,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Protótipo sem autenticação: acesso liberado para a chave anônima.
-- ⚠️  Antes de ir para produção, habilite o Supabase Auth e substitua pelas
--     políticas por usuário (exemplo ao final).
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'users', 'careers', 'regions', 'positions', 'exam_boards', 'contests', 'subjects', 'topics',
    'contest_subjects', 'contest_topics', 'user_positions', 'user_topics', 'summaries',
    'questions', 'question_attempts', 'flashcards', 'ai_generations'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "prototype_all_%s" on public.%I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- Exemplo de política com autenticação (para cada tabela com user_id):
--   drop policy "prototype_all_summaries" on public.summaries;
--   create policy "own_summaries" on public.summaries
--     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
