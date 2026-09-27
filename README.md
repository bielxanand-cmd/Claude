# 🏋️ Rotina de Treinos

App web simples para gerenciar sua rotina de musculação. Funciona 100% no navegador, sem instalação nem servidor: os dados ficam salvos no `localStorage`.

## Como usar

Abra o arquivo `index.html` no navegador. Se preferir servir localmente:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Funcionalidades

- **Hoje**: mostra a semana atual (dias treinados em verde) e os treinos agendados para o dia.
- **Sessão de treino**: marque cada série concluída e ajuste carga e repetições na hora. A barra de progresso acompanha as séries feitas.
- **Timer de descanso**: começa sozinho ao marcar uma série, usando o descanso definido para o exercício. Tem os botões +15s e Pular, e vibra/apita no fim.
- **Como executar**: cada exercício tem uma ilustração animada do movimento e um passo a passo da execução correta, com o erro mais comum a evitar. Toque no exercício (no card do treino, na aba Treinos ou durante a sessão) para abrir.
- **Substituir exercício**: sugere outro exercício para o mesmo músculo, com uma execução diferente (outro movimento ou equipamento). Dá para ver outras opções antes de confirmar. A troca vale para a sessão e para o treino salvo.
- **Treinos**: crie, edite, duplique e exclua treinos (ex.: A/B/C), com dias da semana e exercícios (séries, reps, carga, descanso).
- **Progressão automática**: ao finalizar, o treino guarda a carga e as reps da última série feita, que viram o ponto de partida da próxima sessão.
- **Histórico**: sessões com data, duração, séries, volume (kg × reps) e observações.
- **Progresso**: total de treinos, treinos nos últimos 30 dias, semanas seguidas treinando, volume total e gráfico de carga máxima por exercício.
- **Backup**: exporte e importe seus dados em JSON.

## Estrutura

| Arquivo      | Descrição                                   |
|--------------|---------------------------------------------|
| `index.html` | Estrutura da página e modal de treino        |
| `styles.css` | Estilos (mobile-first, com tema escuro automático) |
| `exercicios.js` | Biblioteca de exercícios, dicas de execução e ilustrações em SVG |
| `app.js`     | Lógica, persistência, timer e gráfico        |
