-- Subtemas: um tema pode pertencer a outro tema do mesmo assunto.
alter table public.topic_themes
  add column parent_id uuid references public.topic_themes (id) on delete cascade;

create index topic_themes_parent_idx on public.topic_themes (parent_id);
