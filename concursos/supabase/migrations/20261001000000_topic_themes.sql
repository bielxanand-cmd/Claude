-- Temas de um assunto: subdivisões com resumo e pontos importantes próprios.
create table public.topic_themes (
  id               uuid primary key,
  user_id          uuid not null references public.users (id) on delete cascade,
  topic_id         text not null references public.topics (id) on delete cascade,
  title            text not null,
  summary_html     text not null default '',
  key_points_html  text not null default '',
  plain_text       text not null default '',
  position         int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index topic_themes_user_topic_idx on public.topic_themes (user_id, topic_id, position);
create index topic_themes_search_idx on public.topic_themes using gin (to_tsvector('portuguese', plain_text));

alter table public.topic_themes enable row level security;
create policy "prototype_all_topic_themes" on public.topic_themes for all using (true) with check (true);
