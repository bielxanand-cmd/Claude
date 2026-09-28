# ⚡ SDR Plantão

Gerenciador de tarefas para SDR focado em **speed-to-lead** (SLA de 5 min), **cadência de follow-up** e na meta de **10 reuniões/dia**.
Roda localmente: Next.js + SQLite (Prisma). Sem login.

## Como rodar

Requisito: Node.js 20+.

```bash
cd sdr
npm install
npm run setup      # cria o banco (prisma/dev.db) e carrega os dados de exemplo
npm run dev        # abre em http://localhost:3000
```

- `npm run seed`: apaga tudo e recarrega os dados de exemplo (uma semana simulada + 3 leads "chegando agora").
- `npm run reset`: recria o banco do zero e roda o seed.
- `npm test`: testes das regras de data (cadência, confirmação, expediente) e do webhook.

**Primeiro passo:** abra **Configurações** e preencha seu nome, a empresa, o produto (1-2 frases), o horário de trabalho, as 3 perguntas de qualificação e os templates.
Depois clique em **🔔 Ativar alertas** no topo, para liberar o som e as notificações do navegador.

## Como usar no dia a dia

Deixe a tela **Plantão** aberta o dia todo. Ela sempre mostra o que fazer agora, nesta ordem:

1. **Leads novos no SLA**: aparecem também no banner do topo de todas as telas, com cronômetro de 5:00 (verde > 2 min, amarelo ≤ 2 min, vermelho estourado). Quando entra um lead novo, você ouve um bipe e recebe uma notificação; quando falta 1 min, recebe outro aviso.
2. **Confirmar reuniões**: tarefas de confirmação por WhatsApp.
3. **Follow-ups atrasados**: tarefas de dias anteriores que não foram feitas.
4. **Follow-ups de hoje**: primeiro os disponíveis agora, dos leads mais qualificados e mais recentes; depois os que vencem mais tarde.

Aperte **Espaço** para abrir o próximo item. Na tela do lead:

- Siga o **script** (abertura → 3 perguntas → fechamento com dois horários sugeridos). Marque ✓ nas perguntas em que o lead se encaixa: isso vira a nota de qualificação (★) usada para priorizar a fila.
- Registre o resultado com 1 tecla: `1` Não atendeu · `2` Agendou · `3` Retornar depois · `4` Desqualificado · `5` Número inválido · `6` Mensagem enviada.
- Na mensagem: `W` abre o WhatsApp (wa.me) com o texto pronto, `C` copia e `E` abre o e-mail.
- Quando a cadência pede uma ação imediata (ex.: WhatsApp logo depois da ligação), o app continua no mesmo lead. Caso contrário, volta para a fila.

Aperte `?` em qualquer tela para ver todos os atalhos.

### Regras automáticas

- **Speed-to-lead**: é registrado na primeira tentativa, em qualquer canal. Se o lead chega fora do expediente, o SLA começa a contar na abertura do dia seguinte e ele aparece no bloco de **Abertura**.
- **Cadência** (editável em Configurações): quando você registra a primeira tentativa sem sucesso, as demais tarefas são geradas: D0 WhatsApp + e-mail imediatos, D1 ligação + WhatsApp, D2 ligação, D4 ligação + e-mail e D7 mensagem de encerramento. Os dias contam apenas dias úteis, no mesmo horário da 1ª tentativa. Se nada der certo até o último passo, o lead fica "Encerrado".
- **Agendou / Retornar / Desqualificado / Número inválido**: cancelam as tarefas pendentes. "Retornar" cria uma única tarefa de retorno no horário combinado.
- **Agendamento**: o app sugere os próximos horários livres de hoje e do próximo dia útil. Esses horários preenchem `{horario1}` e `{horario2}` no script e nos templates. A tarefa de confirmação é criada automaticamente: **2h antes** se a reunião for no mesmo dia, ou **no fim do dia útil anterior** (30 min antes do fim do expediente).
- **Reuniões**: marque Confirmada, Aconteceu ou No-show. Um no-show gera uma tarefa para reagendar.
- **Estrutura do dia**: nos primeiros 30 min aparece o bloco de **Abertura** (leads que chegaram fora do horário). Nos últimos 30 min aparece o de **Fechamento**, com o checklist: confirmar reuniões de amanhã, revisar pendências e ver o resumo. Os dois também podem ser abertos pelos botões ☀️ e 🌙.

### Dashboard

Mostra a meta (agendadas/10), o speed-to-lead médio, a % de leads atendidos em até 5 min, as taxas de contato (conversas ÷ leads trabalhados), agendamento (agendaram ÷ conversas) e no-show, um gráfico de **em qual tentativa as reuniões saem** e visões diária e semanal.
O card de **gargalo** compara cada etapa com a meta configurada e aponta a pior delas.

## Conectando o formulário (webhook)

Endpoint: `POST http://localhost:3000/api/leads`

Aceita JSON ou `application/x-www-form-urlencoded`/`multipart`. Os campos são reconhecidos em português ou inglês, inclusive dentro de objetos aninhados (`{"data": {...}}`) e listas de campos (`[{"name": "...", "value": "..."}]`):

| Campo | Aceita |
|---|---|
| nome | `nome`, `name`, `full_name`, `first_name` + `last_name` |
| telefone | `telefone`, `phone`, `whatsapp`, `celular`, `tel` |
| email | `email`, `e-mail`, `mail` |
| origem | `origem`, `source`, `utm_source`, `form_name` (ou `?origem=` na URL; padrão "Webhook") |
| interesse | `interesse`, `interest`, `produto`, `servico` |
| observacao | `observacao`, `obs`, `message`, `mensagem`, `notes` |

A data/hora de entrada é o momento em que o webhook chega. Resposta: `201 {"ok": true, "id": 123}`.

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria","telefone":"11999998888","email":"maria@ex.com","origem":"Site","interesse":"Diagnóstico"}'
```

### Deixando o endpoint acessível pela internet

Como o app roda no seu computador, o formulário precisa de uma URL pública que aponte para ele. O jeito mais simples é um túnel:

```bash
# Opção 1: Cloudflare Tunnel (gratuito, sem conta)
npx cloudflared tunnel --url http://localhost:3000
# Opção 2: ngrok
ngrok http 3000
```

Use a URL gerada, por exemplo `https://xxxx.trycloudflare.com/api/leads`.
O túnel expõe o app inteiro, então **defina um token** em Configurações → Webhook. A partir daí o endpoint exige o header `x-webhook-token: SEU_TOKEN` ou `?token=SEU_TOKEN` na URL (útil quando a ferramenta não deixa configurar headers).

### Exemplos de integração

- **Zapier / Make / n8n**: gatilho "novo envio do formulário" → ação *Webhook POST* (JSON) para a URL acima, mapeando nome, telefone e e-mail.
- **RD Station / Typeform / Tally / Elementor / Webflow**: todos têm "Webhook" nas integrações. Cole a URL com `?token=...&origem=NomeDoForm`. O app encontra os campos sozinho.
- **Google Forms**: no editor do formulário, vá em ⋮ → Apps Script e cole:

  ```javascript
  function onFormSubmit(e) {
    const r = {};
    e.response.getItemResponses().forEach(i => r[i.getItem().getTitle().toLowerCase()] = i.getResponse());
    UrlFetchApp.fetch("https://SUA-URL/api/leads?token=SEU_TOKEN&origem=Google%20Forms", {
      method: "post", contentType: "application/json", payload: JSON.stringify(r),
    });
  }
  ```

  Depois crie o acionador "Ao enviar formulário". Use perguntas com títulos como "Nome", "Telefone" e "E-mail".

## Importação por CSV

Em **Leads → Importar CSV**. É necessário um cabeçalho; as colunas são as mesmas do webhook, mais uma coluna opcional `data` (data/hora da inscrição).
Há um arquivo de exemplo em `public/exemplo-leads.csv`. Leads importados entram como "Novo", com o cronômetro de SLA.

## Estrutura

```
prisma/schema.prisma   modelo de dados (Lead, Attempt, Task, CadenceStep, Meeting, Template, Settings)
prisma/seed.ts         dados de exemplo (simula uma semana usando as regras reais)
lib/                   regras de negócio: cadência, tentativas, agendamento, fila, métricas, fuso horário
app/api/               rotas HTTP (webhook, fila, tentativas, reuniões, métricas, config)
app/ + components/     telas
```

Todos os horários usam o fuso de São Paulo (UTC-3), definido em `lib/time.ts`.
