# Aprova — Estudos para Concursos

Aplicativo web para organizar a preparação para concursos públicos. O usuário escolhe **carreira → esfera (federal/estadual/municipal) → estado → cargo**, e o app monta o plano de estudos **consolidando os editais anteriores** do cargo: disciplinas, assuntos, frequência de cada assunto e a fonte (edital) de cada item. Em cada assunto é possível escrever resumos num editor rico, marcar status e acompanhar o progresso por disciplina e geral.

> ⚠️ **Dados demonstrativos.** Os editais do seed (`origin = 'demo'`) são ilustrativos e **não reproduzem editais oficiais**. A interface sinaliza isso com o selo “Dados demonstrativos”. Para usar dados reais, importe editais (texto do conteúdo programático) ou cadastre a base oficial no Supabase.

## Como rodar

```bash
cd concursos
npm install
npm run dev          # http://localhost:5173
```

Sem configuração nenhuma o app funciona em **modo local**: catálogo vindo do seed e dados do usuário no `localStorage`.

### Com Supabase

1. Crie um projeto no Supabase e aplique `supabase/migrations/*.sql` (SQL Editor ou `supabase db push`).
2. Rode `supabase/seed.sql` para carregar carreiras, cargos e editais demonstrativos.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Enquanto não há autenticação, o app cria um usuário anônimo (id salvo no navegador) e as políticas RLS são permissivas (`prototype_*`). Ao ativar o Supabase Auth, o id do usuário passa a ser `auth.uid()` automaticamente; troque as políticas pelas de exemplo no fim da migration.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção |
| `npm test` | Testes unitários (consolidação, progresso, parser de edital) e validação do schema SQL num Postgres embutido (PGlite) |
| `npm run test:e2e` | Fluxo completo no navegador (desktop e mobile) com Playwright |
| `npm run db:seed-sql` | Regera `supabase/seed.sql` a partir do seed TypeScript |
| `npm run lint` | oxlint |

## Arquitetura

```
src/
  domain/          regras puras (sem React): tipos, consolidação de editais,
                   cálculo de progresso, parser de edital, busca, rótulos
  data/
    seed/          dados demonstrativos (fonte única para o app e o seed.sql)
    sources/       contrato DataSource + implementações local e Supabase
    queries.ts     hooks TanStack Query (cache, atualização otimista)
  components/
    ui/            componentes base no estilo shadcn/ui (Button, Card, Dialog…)
    layout/        sidebar, topbar, menu mobile, busca global (Ctrl+K)
    study/         cards de disciplina, linhas de assunto, status, fontes…
    editor/        editor rico (TipTap)
    charts/        gráficos de progresso
  features/
    ai/            registro de ações de IA + contrato AiProvider (botões “em breve”)
    import/        importação de edital por texto
    questions/     tipos do futuro módulo de questões
  pages/           uma página por rota (carregadas sob demanda)
supabase/
  migrations/      schema completo (catálogo, dados do usuário, tabelas futuras)
  seed.sql         gerado automaticamente
e2e/               testes Playwright do fluxo de ponta a ponta
```

### Como o plano de estudos é montado

`careers → positions → contests` (editais) → `contest_subjects` / `contest_topics`.
`consolidateStudyPlan` une as disciplinas e os assuntos de todos os editais do cargo, calcula peso médio, nº médio de questões e **frequência** (em quantos editais cada assunto apareceu), e guarda os editais-fonte de cada item. No banco há também a view `position_topic_frequency`.

Todos os canais de entrada (seed, texto colado, PDF e API no futuro) convergem para o formato `NoticeImport` e para `planNoticeImport`, que reaproveita disciplinas/assuntos existentes (comparação sem acento/caixa) e registra a origem (`notice_origin`).

### Importação de edital (PDF ou texto)

Em **Meu concurso → Importar edital**, envie o PDF do edital ou cole o texto:

1. `features/import/pdf-text.ts` extrai o texto do PDF no navegador (build *legacy* do pdf.js, compatível com Safari e navegadores não tão recentes); nada é enviado a servidores. A leitura usa um Web Worker e, se o ambiente bloquear workers, cai automaticamente para a página principal (a versão publicada usa sempre a página principal: `VITE_PDF_MAIN_THREAD=true`). PDFs escaneados (sem texto) são detectados e o usuário é orientado a colar o texto.
2. `findSyllabusSection` localiza a seção de conteúdos ("Dos objetos de avaliação", "Conteúdo programático", "Conhecimentos exigidos"…) e para no próximo ANEXO.
3. `parseSyllabus` reconhece disciplinas e assuntos nos formatos das bancas: `1 Item. 2 Item. 4.1 Subitem` (Cebraspe), `1.`/`1)`/`1 –` (FGV, FCC, Vunesp…), títulos sozinhos na linha, várias disciplinas na mesma linha, listas com marcadores e grupos (Bloco I, Conhecimentos básicos). A numeração é validada em sequência, então números de leis (“Lei nº 8.112/1990”) não quebram os itens.
4. `detectNoticeMetadata` preenche órgão, sigla, ano, banca e esfera.
5. O usuário revisa: renomeia/desmarca disciplinas, remove assuntos e escolhe se os subitens (4.1, 4.2…) viram assuntos ou ficam como detalhes (exibidos em “O que o edital cobra”, gravados em `contest_topics.details`).

Os testes usam um trecho real do Edital nº 1 – PRF/2021 (`src/domain/__fixtures__`).

### Onde os dados ficam salvos

| Modo | Quando | Onde |
| --- | --- | --- |
| Supabase | `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` definidos | banco Postgres (`supabase/migrations`) |
| Conta do Claude | página publicada no claude.ai (`VITE_CLOUD_STORAGE=true`) | banco privado da página, em `data/users/<id>/` — visível só para o próprio usuário, disponível em qualquer navegador/dispositivo |
| Navegador | demais casos (`npm run dev`) | `localStorage` |

A camada `src/data/persistence` carrega tudo uma vez e grava só o documento afetado por cada alteração (perfil/histórico, progresso, um documento por resumo e um por edital importado — cada documento tem limite de 256 KB). Na primeira abertura na conta, o que estava salvo no navegador é migrado automaticamente. **Meus concursos** guarda os concursos já abertos (até 20) para voltar a eles com um clique, sem refazer o cadastro nem reimportar editais.

### Flashcards

Em cada assunto, **Flashcards** (ou “✨ Criar flashcards” no assistente) sugere cartões a partir do resumo (`domain/flashcards.ts`, sem IA):
trechos em negrito/destaque viram lacunas, “Tema: explicação” vira pergunta, título + lista vira “liste”, e frases de Pontos importantes/Pegadinhas viram verdadeiro ou falso. O usuário escolhe quais adicionar, edita, exclui e cria cartões à mão. Na página publicada, **Gerar com o Claude** (capacidade `sample`, usa a cota do próprio usuário) sugere cartões usando apenas o texto do resumo.

A revisão usa um SM-2 simplificado (Errei 10 min · Difícil 1 h/×1,2 · Acertei 1 → 3 → ×facilidade dias · Fácil). A página da disciplina reúne os cartões de todos os assuntos e mostra quantos estão para revisar.

### Progresso

- Disciplina = assuntos concluídos ÷ assuntos da disciplina.
- Geral = assuntos concluídos ÷ todos os assuntos do cargo.
- Status: `not_started` (cinza), `in_progress` (roxo), `completed` (verde). A atualização é otimista, então as barras mudam na hora.
- Resumos e status ficam ligados a **usuário + assunto**; o mesmo assunto em outro cargo reaproveita seu resumo.

### Preparado para evoluir

- **IA**: `features/ai/actions.ts` lista as ações (resumir, questões, flashcards, explicar, mapa mental). Basta implementar `AiProvider` e marcar `available: true`. A tabela `ai_generations` guarda os resultados.
- **Questões/simulados**: tabelas `questions`, `question_attempts` e `exam_boards` (bancas) já existem, ligadas a assunto, disciplina, edital e banca; `features/questions/types.ts` tem os tipos e o cálculo de desempenho.
- **Flashcards / revisão espaçada**: tabela `flashcards` com campos SM-2.
- **PDF**: `contests.source_file_path`/`raw_syllabus`; extraia o texto e reutilize `parseNoticeSyllabus`.
- **Autenticação**: `users` + RLS por usuário (exemplo na migration).

## Rotas

`/` · `/onboarding` · `/dashboard` · `/disciplinas` · `/disciplina/:id` · `/assunto/:id` · `/resumos` · `/progresso` · `/concursos` (meu concurso + importar edital) · `/carreiras` · `/cargos` · `/cargo/:id` · `/configuracoes`
