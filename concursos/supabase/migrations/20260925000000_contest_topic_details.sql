-- Subitens com que cada edital detalha um assunto (ex.: "4.1 Emprego de
-- elementos de referenciação"). Ficam no vínculo edital × assunto porque
-- editais diferentes detalham o mesmo assunto de formas diferentes.
alter table public.contest_topics
  add column details text[] not null default '{}';
