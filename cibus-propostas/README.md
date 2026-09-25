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
2. No SQL Editor, execute os arquivos de `supabase/migrations/` em ordem e depois `supabase/seed.sql`.
3. Em *Authentication → Users*, crie os usuários dos executivos (e-mail e senha).
4. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Com o Supabase configurado, o app exige login e todas as tabelas ficam restritas a usuários autenticados (RLS). As imagens enviadas vão para o bucket público `assets`.

### Tabelas

| Tabela | Conteúdo |
| --- | --- |
| `proposals` | dados do cliente, da proposta, da capa, do ROI, do encerramento e das seções ativas |
| `proposal_scenarios` | operação atual, texto do cenário, desafios, oportunidades |
| `proposal_projects` | objetivo, estratégia, "como o Cibus ajuda", módulos do projeto |
| `proposal_modules` | itens da lista "O que está incluso" (marcados ou não) |
| `proposal_investments` | postos, mensalidade por posto, implantação (1º posto e adicionais), descontos, itens sob consumo |
| `proposal_cases` | cases selecionados e a ordem de apresentação |
| `modules`, `cases`, `executives`, `settings` | bibliotecas e configurações da área administrativa |

A proposta inteira é gravada em uma única transação pela função `save_proposal(jsonb)`. `supabase/seed.sql` é gerado a partir de `src/data/seed.ts` com `npx vite-node scripts/gen-seed-sql.ts`.

## Produtos: Cibus Fuel e Cibus Partner

Ao criar uma nova proposta, o vendedor escolhe o produto. O produto define:

| | Cibus Fuel | Cibus Partner |
| --- | --- | --- |
| Cores | laranja `#FF5C00` + azul-escuro `#101828` | verde `#00B35F` + preto `#111111` |
| Capa | "Transforme cada compra em um novo motivo para voltar" + app Cibus | "Fidelize que influencia sua compra no Balcão" + arte do balcão |
| Unidade | posto (mensalidade por posto, "1º posto") | loja (mensalidade por loja, "1ª loja") |
| Logo | Cibus | Cibus + selo "Partner" |

Trocar o produto no campo *Produto* muda na hora as cores e a unidade de todos os slides, e troca os textos e preços que ainda estão no padrão do produto anterior. O que o vendedor editou é mantido. Cores, textos e preços de cada produto são configurados em *Configurações › Geral* (`src/lib/products.ts`).

## Fluxo

1. **Minhas propostas:** lista com cliente, empresa, executivo, data, valor mensal, status e última atualização. Ações: editar, editor visual, visualizar, duplicar, gerar PDF, mudar status e excluir.
2. **Nova proposta:** parte do *Template padrão Cibus* ou de uma proposta anterior (a cópia leva estrutura, módulos, preços, cases e textos).
3. **Assistente em 7 etapas:** Cliente → Cenário → Projeto → Investimento → ROI → Cases → Revisão, com prévia do slide ao vivo e salvamento automático.
4. **Editor visual:** páginas à esquerda, prévia no centro e painel de edição à direita.
5. **Modo apresentação:** slides em tela cheia; navegação pelas setas ou pelo teclado (←/→).
6. **Revisão e PDF:** liga/desliga de cada página do PDF (Capa, Cenário, Projeto, Investimentos, ROI, Cases, Encerramento), com as pendências de cada uma. Pendências são avisos e não impedem a geração: o vendedor completa a página ou a retira do PDF.

## Bureau de Marketing

Logo depois de "O projeto" entra a página do **Bureau de Marketing Cibus**, a agência interna. Ela mostra a apresentação do Bureau, as colunas *Planejamos*, *Criamos* e *Orientamos* e a observação sobre o que não está incluso. O texto vem pronto, é editável por proposta (etapa Projeto ou editor visual) e pode ser restaurado ao padrão. Como as outras páginas, pode ser ligada ou desligada na revisão.

## Como o PDF é gerado

Cada página é um componente de layout fixo de **1280×720**, com a fonte **Roboto** (o sistema usa Plus Jakarta Sans) (`src/components/slides/slides.tsx`). A mesma página aparece na prévia, no editor, no modo apresentação e no PDF. Na exportação, cada slide é renderizado fora da tela, capturado a 3200×1800 e colocado em uma página 16:9 do jsPDF. O botão "Simular ROI" e os contatos do encerramento continuam clicáveis no PDF.

- Os textos longos passam pelo `FitBox`, que reduz a fonte até um tamanho mínimo legível. Se ainda não couber, a página mostra um aviso no editor e na revisão.
- Listas longas (desafios, oportunidades, itens sob consumo) são limitadas ao que cabe no layout, e o formulário avisa quando esse limite é ultrapassado.
- Seções desativadas não geram páginas. Cada case selecionado gera uma página.

## Cálculos

Tudo fica em `src/lib/pricing.ts`, com testes em `pricing.test.ts`:

- mensalidade = valor por posto (padrão R$ 540) menos o desconto (% ou R$) e os descontos personalizados, aplicados em cascata;
- total da rede = mensalidade por posto × quantidade de postos;
- implantação = valor do 1º posto (padrão R$ 6.000) + valor de cada posto adicional (padrão R$ 600) × (postos − 1), com desconto opcional ou "Implantação gratuita" (exibida como *Isenta*);
- economia = valor de tabela − valor final; desconto % = economia ÷ valor de tabela × 100.

O slide de investimento mostra a mensalidade por posto, o total da rede, a implantação com o detalhamento e a lista **O que está incluso**, com os itens que o vendedor marcou.

## Área administrativa

Em *Configurações*:

- **Itens inclusos:** nome, descrição, categoria, ativo/inativo (a lista usada em "O que está incluso" e em "Módulos do projeto").
- **Cases:** cliente, segmento, localização, logo, imagem, descrição e até 4 resultados, com prévia do slide.
- **Executivos:** nome, cargo, e-mail, telefone, WhatsApp, foto.
- **Geral:** logos (fundo claro e escuro), cores, URL da calculadora de ROI, contatos e padrões das novas propostas.
