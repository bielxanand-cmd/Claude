-- Histórico de concursos: `user_positions` já guarda cada escolha; `forgotten`
-- permite tirar um concurso da lista "Meus concursos" sem apagar o registro.
alter table public.user_positions
  add column forgotten boolean not null default false;

create index user_positions_history_idx on public.user_positions (user_id, created_at desc);
