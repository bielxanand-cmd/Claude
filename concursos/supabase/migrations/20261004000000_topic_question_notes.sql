-- Caderno de erros: anotações das questões erradas de um assunto, com tema
-- e subtema opcionais para filtrar.
create table public.topic_question_notes (
  id            uuid primary key,
  user_id       uuid not null references public.users (id) on delete cascade,
  topic_id      text not null references public.topics (id) on delete cascade,
  theme_id      uuid references public.topic_themes (id) on delete set null,
  subtheme_id   uuid references public.topic_themes (id) on delete set null,
  content_html  text not null default '',
  plain_text    text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index topic_question_notes_user_topic_idx on public.topic_question_notes (user_id, topic_id, created_at);
create index topic_question_notes_search_idx on public.topic_question_notes using gin (to_tsvector('portuguese', plain_text));

alter table public.topic_question_notes enable row level security;
create policy "prototype_all_topic_question_notes" on public.topic_question_notes for all using (true) with check (true);
