# Cibus Propostas

Plataforma interna para criar, editar e gerar propostas comerciais da Cibus em PDF 16:9 com visual de apresentação.

**Stack:** React 19 + TypeScript + Vite · Tailwind CSS + componentes no padrão shadcn/ui (Radix) · Lucide · Tiptap (texto rico) · dnd-kit · Supabase · html-to-image + jsPDF.

## Rodando

```bash
cd cibus-propostas
npm install
npm run dev        # http://localhost:5173
npm test           # testes dos cálculos financeiros
npm run build      # typecheck + build de produção
```

Sem variáveis de ambiente, o app roda em **modo local**: os dados ficam no IndexedDB do navegador, com módulos, cases e configurações iniciais já cadastrados. Serve para testar e demonstrar; nada é compartilhado entre computadores.

## Conectando ao Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, execute `supabase/migrations/0001_cibus_propostas.sql` e depois `supabase/seed.sql`.
3. Em *Authentication → Users*, crie os usuários dos executivos (e-mail e senha).
4. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Com o Supabase configurado, o app exige login e todas as tabelas ficam restritas a usuários autenticados (RLS). As imagens enviadas vão para o bucket público `assets`.

### Tabelas

| Tabela | Conteúdo |
| --- | --- |
| `proposals` | dados do cliente, da proposta, da capa, do ROI, do encerramento e das seções ativas |
| `proposal_scenarios` | operação atual, texto do cenário, desafios, oportunidades |
| `proposal_projects` | objetivo, estratégia, "como o Cibus ajuda", módulos do projeto |
| `proposal_modules` | linhas da tabela de investimento (valor de tabela, desconto, valor final, incluso) |
| `proposal_investments` | postos, implantação, mensalidade, descontos personalizados, itens sob consumo |
| `proposal_cases` | cases selecionados e a ordem de apresentação |
| `modules`, `cases`, `executives`, `settings` | bibliotecas e configurações da área administrativa |

A proposta inteira é gravada em uma única transação pela função `save_proposal(jsonb)`. `supabase/seed.sql` é gerado a partir de `src/data/seed.ts` com `npx vite-node scripts/gen-seed-sql.ts`.

## Fluxo

1. **Minhas propostas:** lista com cliente, empresa, executivo, data, valor mensal, status e última atualização. Ações: editar, editor visual, visualizar, duplicar, gerar PDF, mudar status e excluir.
2. **Nova proposta:** parte do *Template padrão Cibus* ou de uma proposta anterior (a cópia leva estrutura, módulos, preços, cases e textos).
3. **Assistente em 7 etapas:** Cliente → Cenário → Projeto → Investimento → ROI → Cases → Revisão, com prévia do slide ao vivo e salvamento automático.
4. **Editor visual:** páginas à esquerda, prévia no centro e painel de edição à direita.
5. **Modo apresentação:** slides em tela cheia; navegação pelas setas ou pelo teclado (←/→).
6. **Revisão e PDF:** checklist de validação ("Sua proposta está pronta!") e geração do PDF.

## Como o PDF é gerado

Cada página é um componente de layout fixo de **1280×720** (`src/components/slides/slides.tsx`). A mesma página aparece na prévia, no editor, no modo apresentação e no PDF. Na exportação, cada slide é renderizado fora da tela, capturado a 3200×1800 e colocado em uma página 16:9 do jsPDF. O botão "Simular ROI" e os contatos do encerramento continuam clicáveis no PDF.

- Os textos longos passam pelo `FitBox`, que reduz a fonte até um tamanho mínimo legível. Se ainda não couber, a página mostra um aviso no editor e na revisão.
- Listas longas (desafios, oportunidades, itens sob consumo) são limitadas ao que cabe no layout, e o formulário avisa quando esse limite é ultrapassado.
- Seções desativadas não geram páginas. Cases geram uma página cada, mais uma visão geral quando há dois ou mais.

## Cálculos

Tudo fica em `src/lib/pricing.ts`, com testes em `pricing.test.ts`:

- mensalidade por posto = soma dos valores negociados dos módulos inclusos, menos o desconto mensal (% ou R$) e os descontos personalizados, aplicados em cascata;
- total da rede = mensalidade por posto × quantidade de postos;
- economia = valor de tabela − valor final; desconto % = economia ÷ valor de tabela × 100;
- implantação: valor, desconto (% ou R$) ou "Implantação gratuita" (exibida como *Isenta*).

## Área administrativa

Em *Configurações*:

- **Módulos:** nome, descrição, categoria, valor padrão, ativo/inativo.
- **Cases:** cliente, segmento, localização, logo, imagem, descrição e até 4 resultados, com prévia do slide.
- **Executivos:** nome, cargo, e-mail, telefone, WhatsApp, foto.
- **Geral:** logos (fundo claro e escuro), cores, URL da calculadora de ROI, contatos e padrões das novas propostas.
