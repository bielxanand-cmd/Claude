-- Provas anteriores analisadas pelo usuário (questões por disciplina e assuntos mais cobrados), por cargo.
create table public.user_exam_analyses (
  id           uuid primary key,
  user_id      uuid not null references public.users (id) on delete cascade,
  position_id  text not null,
  result       jsonb not null,
  created_at   timestamptz not null default now()
);

create index user_exam_analyses_user_position_idx on public.user_exam_analyses (user_id, position_id);

alter table public.user_exam_analyses enable row level security;
create policy "prototype_all_user_exam_analyses" on public.user_exam_analyses for all using (true) with check (true);
