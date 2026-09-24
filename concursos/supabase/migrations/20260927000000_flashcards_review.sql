-- Flashcards: tipo, origem, contexto e estado completo da revisão espaçada.
alter table public.flashcards
  add column kind text not null default 'qa',            -- qa | cloze | list | truefalse
  add column source text not null default 'manual',      -- summary | ai | manual
  add column context text,
  add column reps int not null default 0,
  add column lapses int not null default 0,
  add column last_reviewed_at timestamptz;

create index flashcards_user_due_idx on public.flashcards (user_id, due_at);
