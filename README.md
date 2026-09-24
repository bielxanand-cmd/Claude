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
| `app.js`     | Lógica, persistência, timer e gráfico        |

---

## 📚 Aprova — Estudos para Concursos

Este repositório também contém, na pasta [`concursos/`](concursos/), um app React + TypeScript + Supabase para organizar estudos de concursos públicos. Veja o [README do app](concursos/README.md).
