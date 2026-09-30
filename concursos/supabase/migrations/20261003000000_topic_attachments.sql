-- Anexos dos assuntos (fichas). O conteúdo do arquivo fica fora do banco
-- (no app: armazenamento do navegador; em produção, use o Supabase Storage
-- e guarde o caminho em blob_id).
create table public.topic_attachments (
  id            uuid primary key,
  user_id       uuid not null references public.users (id) on delete cascade,
  topic_id      text not null references public.topics (id) on delete cascade,
  name          text not null,
  content_type  text not null,
  size_bytes    bigint not null default 0,
  blob_id       text not null,
  created_at    timestamptz not null default now()
);

create index topic_attachments_user_topic_idx on public.topic_attachments (user_id, topic_id, created_at);

alter table public.topic_attachments enable row level security;
create policy "prototype_all_topic_attachments" on public.topic_attachments for all using (true) with check (true);
