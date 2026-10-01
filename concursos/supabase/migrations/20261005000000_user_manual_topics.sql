-- Assuntos criados pelo próprio usuário dentro de uma disciplina do plano de um cargo.
create table public.user_manual_topics (
  id           text primary key,
  user_id      uuid not null references public.users (id) on delete cascade,
  position_id  text not null references public.positions (id) on delete cascade,
  subject_id   text not null references public.subjects (id) on delete cascade,
  name         text not null,
  details      text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index user_manual_topics_user_position_idx on public.user_manual_topics (user_id, position_id);

alter table public.user_manual_topics enable row level security;
create policy "prototype_all_user_manual_topics" on public.user_manual_topics for all using (true) with check (true);
