# Rumo

Gerenciador de projetos e tarefas (estilo Todoist) publicado como artefato no claude.ai.

- **Projetos** com quadro kanban de etapas personalizáveis (renomear, reordenar, marcar a etapa final), lista e calendário.
- **Hoje / Próximos 7 dias / Calendário** com arrastar e soltar para reagendar.
- **Caixa de tarefa em linguagem natural**: `Ligar para Ana amanhã 14h #sdr p1`, `Revisar metas toda semana`.
- **Tarefas recorrentes**, subtarefas, prioridades P1–P4 e link "Adicionar ao Google Agenda".
- **Disciplina**: meta diária, sequência de dias batendo a meta e dashboard.
- **Claude**: entrevista o projeto e sugere etapas, rotina e tarefas; planeja o dia; conversa sobre cada projeto.

`rumo.html` é a página publicada (dados no banco do artefato). `node nucleo.test.cjs` testa as regras de datas, linguagem natural, recorrência e métricas.
