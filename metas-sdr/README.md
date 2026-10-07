# Metas SDR

Plataforma para acompanhar a execução do dia: você soma quantas **ligações** e quantos **agendamentos** fez, e vê quanto falta para a meta de agendamentos, no dia, no mês e no histórico mês a mês. Não é um CRM: não há cadastro de leads.

Feita com Next.js (App Router) + TypeScript, Tailwind CSS (componentes no estilo shadcn/ui), Recharts, Prisma + SQLite e date-fns (fuso `America/Sao_Paulo`).

## Instalar e rodar

Requisitos: **Node.js 20 ou mais novo**.

```bash
cd metas-sdr
npm install      # instala dependências, gera o cliente Prisma e cria o banco (prisma/dev.db)
npm run dev      # abre em http://localhost:3000
```

Não é preciso configurar nada além disso. O arquivo `.env` já aponta para o banco SQLite local, e na primeira execução o app cria o usuário padrão com meta diária de **4 agendamentos**. Você muda esse valor em Configurações.

Se você já tinha rodado a versão anterior (com cadastro de leads), o `npm install` aplica a migração que converte ligações e agendamentos em contagens, sem perder o histórico.

### Dados de exemplo

Para ver os dashboards cheios, gere ~3 meses de lançamentos fictícios:

```bash
npm run seed              # só roda se o banco estiver vazio
npm run seed -- --force   # APAGA seus dados e recria os de exemplo
```

Para voltar a um banco vazio, apague o arquivo `prisma/dev.db` e rode `npx prisma migrate deploy` (ou `npm install` de novo).

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm test` | Testes das regras de cálculo (Vitest) |
| `npm run lint` | Checagem de tipos (TypeScript) |
| `npm run build` + `npm start` | Versão de produção |

## Telas

- **Hoje**: cards de ligações, agendamentos e "faltam X". Também mostra o anel de progresso da meta (vermelho < 50%, amarelo 50–99%, verde ≥ 100%), o indicador de ritmo ("no ritmo atual você termina o dia com N") e os lançamentos do dia, com opção de editar e excluir.
- **Mês**: seletor de mês, agendamentos × meta mensal, dias com meta batida, média por dia, ligações, cancelados, conversão de ligações em agendamentos, gráfico diário e calendário.
- **Histórico**: tabela e gráfico mês a mês com % de atingimento, dias com meta batida, meta mensal batida (sim/não), ligações, conversão e cancelados. Destaca o melhor mês e a sequência atual de dias batendo a meta.
- **Configurações**: metas, jornada padrão, dias sem meta, exportação CSV e backup/restauração.

### Registro rápido

Os botões **+ Ligações** e **+ Agendamentos** ficam sempre à mão: no topo no computador e no rodapé no celular. Também dá para usar as teclas **C** e **A**.

- Escolha a quantidade (começa em 1; para ligações há atalhos de 5, 10 e 20) e confirme.
- **Cancelamento:** em + Agendamentos, troque para **Cancelou** e informe o dia em que o agendamento tinha sido feito (padrão: hoje). O cancelamento desconta daquele dia.
- Para lançar algo que ficou para trás, use "Lançar em outro horário".

## Como alterar as metas

Vá em **Configurações → Metas**.

- **Meta diária:** informe o valor e a data a partir da qual ele vale (padrão: hoje). Também dá para mudar direto na tela Hoje, no botão **Meta**.
- **Meta mensal:** escolha entre
  - **Calcular**, o padrão: soma a meta diária vigente em cada dia útil do mês;
  - **Valor fixo**, a partir de um mês.

Toda mudança entra no **histórico de metas**. Cada dia é avaliado com a meta que valia naquela data, então **mudar a meta não altera o resultado de dias passados**.

A **jornada** (horário de trabalho usado no indicador de ritmo) tem um padrão em Configurações e pode ser ajustada para o dia na tela Hoje, em "Jornada hoje".

## Regras de negócio

- Só contam como dia útil os dias de **segunda a sexta** que não estão cadastrados como **dia sem meta** (feriado, folga, férias).
- Agendamentos que contam para a meta, por dia: `agendamentos lançados − cancelamentos daquele dia` (nunca negativo). Os cancelados aparecem separados nas telas.
- Um cancelamento desconta do dia em que o agendamento **foi feito**, mesmo que seja lançado dias depois.
- **Meta atingida no dia:** agendamentos do dia ≥ meta diária vigente.
- **Faltam:** `max(0, meta − realizado)`, no dia e no mês.
- **Sequência:** dias úteis seguidos batendo a meta. Dias sem meta não quebram a sequência, e o dia de hoje só quebra quando termina sem bater a meta.
- **Ritmo:** agendamentos até agora ÷ fração da jornada já decorrida.
- Fuso horário: `America/Sao_Paulo`. Datas são exibidas como dd/mm/aaaa. Nos campos de data, o formato segue o idioma do navegador.

As regras ficam em funções puras em `src/lib/metas/regras.ts`, cobertas por `tests/`.

## Exportar e backup

Em **Configurações → Exportar e backup**:

- **CSV** do resumo por dia (ligações, agendamentos, cancelados, meta e se bateu) e de todos os lançamentos, com separador `;` para abrir direto no Excel.
- **Backup completo** em JSON.
- **Restaurar:** substitui todos os dados pelos do arquivo. Antes de apagar qualquer coisa, o arquivo inteiro é validado, e a troca é feita numa transação.

## Estrutura

```
metas-sdr/
├─ prisma/          schema.prisma, migrations, seed.ts, bootstrap.ts
├─ src/app/         páginas (Hoje, mes, historico, configuracoes) e rotas /api
├─ src/components/  UI, registro rápido, gráficos
├─ src/lib/         datas (fuso SP), regras de metas, rótulos, CSV
├─ src/server/      acesso ao banco, queries, server actions, usuário atual
└─ tests/           testes das regras
```

## Evoluções previstas

- **Postgres:** em `prisma/schema.prisma`, troque `provider = "sqlite"` por `"postgresql"`. Depois ajuste `DATABASE_URL` no `.env`, apague a pasta `prisma/migrations` e rode `npx prisma migrate dev --name init`.
- **Login:** todas as tabelas já têm `userId`. Basta trocar `usuarioAtualId()` em `src/server/usuario.ts` para ler o usuário da sessão (ex.: Auth.js). Hoje ela sempre retorna o usuário padrão.
