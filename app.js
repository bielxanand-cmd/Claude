'use strict';

// ---------- Estado e persistência ----------

const STORAGE_KEY = 'rotina-treinos:v1';
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function estadoInicial() {
  return {
    treinos: [
      {
        id: uid(),
        nome: 'Treino A – Peito e Tríceps',
        dias: [1, 4],
        exercicios: [
          { id: uid(), nome: 'Supino reto', series: 4, reps: 10, carga: 40, descanso: 90 },
          { id: uid(), nome: 'Supino inclinado com halteres', series: 3, reps: 12, carga: 16, descanso: 90 },
          { id: uid(), nome: 'Tríceps na polia', series: 3, reps: 12, carga: 25, descanso: 60 },
        ],
      },
      {
        id: uid(),
        nome: 'Treino B – Costas e Bíceps',
        dias: [2, 5],
        exercicios: [
          { id: uid(), nome: 'Puxada frontal', series: 4, reps: 10, carga: 45, descanso: 90 },
          { id: uid(), nome: 'Remada curvada', series: 3, reps: 10, carga: 30, descanso: 90 },
          { id: uid(), nome: 'Rosca direta', series: 3, reps: 12, carga: 12, descanso: 60 },
        ],
      },
      {
        id: uid(),
        nome: 'Treino C – Pernas',
        dias: [3, 6],
        exercicios: [
          { id: uid(), nome: 'Agachamento livre', series: 4, reps: 8, carga: 60, descanso: 120 },
          { id: uid(), nome: 'Leg press', series: 3, reps: 12, carga: 120, descanso: 90 },
          { id: uid(), nome: 'Cadeira extensora', series: 3, reps: 15, carga: 35, descanso: 60 },
        ],
      },
    ],
    sessoes: [],
    ativa: null,
  };
}

function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const dados = JSON.parse(raw);
      if (Array.isArray(dados.treinos) && Array.isArray(dados.sessoes)) return dados;
    }
  } catch (e) {
    console.warn('Não foi possível ler os dados salvos:', e);
  }
  return estadoInicial();
}

let estado = carregar();

function salvar() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch (e) {
    console.warn('Não foi possível salvar:', e);
  }
}

// ---------- Utilitários ----------

const $ = (sel, el = document) => el.querySelector(sel);

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function dataLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatarData(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}

function formatarDuracao(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function volumeSessao(s) {
  return s.exercicios.reduce((tot, ex) =>
    tot + ex.series.filter((x) => x.feito).reduce((t, x) => t + x.reps * x.carga, 0), 0);
}

// Diálogos na própria página (alert/confirm nativos podem ser bloqueados)

function confirmar(mensagem, rotuloOk = 'Confirmar') {
  const dlgC = $('#dlg-confirmar');
  $('#dlg-confirmar-msg').textContent = mensagem;
  $('#dlg-confirmar-ok').textContent = rotuloOk;
  dlgC.returnValue = '';
  dlgC.showModal();
  return new Promise((resolve) => {
    dlgC.addEventListener('close', () => resolve(dlgC.returnValue === 'ok'), { once: true });
  });
}

let avisoTimeout = null;
function avisar(mensagem) {
  const el = $('#aviso');
  el.textContent = mensagem;
  el.hidden = false;
  clearTimeout(avisoTimeout);
  avisoTimeout = setTimeout(() => { el.hidden = true; }, 3500);
}

// ---------- Navegação ----------

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => mostrarView(tab.dataset.view));
});

function mostrarView(nome) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === nome));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${nome}`));
  render();
}

function render() {
  renderHoje();
  renderTreinos();
  renderHistorico();
  renderProgresso();
}

// ---------- Hoje ----------

function renderHoje() {
  const el = $('#view-hoje');
  if (estado.ativa) {
    el.innerHTML = htmlSessaoAtiva(estado.ativa);
    return;
  }

  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const doDia = estado.treinos.filter((t) => t.dias.includes(diaSemana));
  const outros = estado.treinos.filter((t) => !t.dias.includes(diaSemana));

  // Semana corrente (domingo a sábado)
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - diaSemana);
  const diasFeitos = new Set(estado.sessoes.map((s) => s.data));
  const semana = DIAS.map((nome, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const cls = [i === diaSemana ? 'hoje' : '', diasFeitos.has(dataLocal(d)) ? 'feito' : ''].join(' ');
    return `<div class="${cls}">${nome}<br>${d.getDate()}</div>`;
  }).join('');

  const cardTreino = (t) => `
    <div class="card">
      <div class="section-head">
        <strong>${esc(t.nome)}</strong>
        <button class="btn primary" data-acao="iniciar" data-id="${t.id}">Iniciar</button>
      </div>
      <p class="muted">${t.exercicios.length} exercício(s) · ${t.exercicios.map((e) => esc(e.nome)).join(', ')}</p>
    </div>`;

  el.innerHTML = `
    <h2>${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
    <div class="card">
      <strong>Esta semana</strong>
      <div class="semana">${semana}</div>
    </div>
    <h3>Treino de hoje</h3>
    ${doDia.length ? doDia.map(cardTreino).join('') : '<div class="card empty">Nenhum treino agendado para hoje. Dia de descanso? 😴</div>'}
    ${outros.length ? `<h3>Outros treinos</h3>${outros.map(cardTreino).join('')}` : ''}
    ${!estado.treinos.length ? '<div class="empty">Crie seu primeiro treino na aba <b>Treinos</b>.</div>' : ''}
  `;
}

function htmlSessaoAtiva(s) {
  const total = s.exercicios.reduce((t, ex) => t + ex.series.length, 0);
  const feitas = s.exercicios.reduce((t, ex) => t + ex.series.filter((x) => x.feito).length, 0);
  const pct = total ? Math.round((feitas / total) * 100) : 0;

  const exercicios = s.exercicios.map((ex, ei) => {
    const completo = ex.series.length && ex.series.every((x) => x.feito);
    const series = ex.series.map((x, si) => `
      <div class="serie">
        <span class="num">${si + 1}ª</span>
        <input type="number" inputmode="decimal" min="0" step="0.5" value="${x.carga}"
               data-campo="carga" data-ex="${ei}" data-serie="${si}" aria-label="Carga (kg)" />
        <input type="number" inputmode="numeric" min="0" step="1" value="${x.reps}"
               data-campo="reps" data-ex="${ei}" data-serie="${si}" aria-label="Repetições" />
        <button class="check ${x.feito ? 'done' : ''}" data-acao="serie" data-ex="${ei}" data-serie="${si}"
                aria-label="Marcar série">✓</button>
      </div>`).join('');

    return `
      <div class="card exercicio-sessao ${completo ? 'completo' : ''}">
        <div class="section-head">
          <strong>${esc(ex.nome)}</strong>
          <span class="muted">descanso ${ex.descanso}s</span>
        </div>
        <div class="serie serie-head"><span></span><span>kg</span><span>reps</span><span></span></div>
        ${series}
        <div class="row">
          <button class="btn small" data-acao="add-serie" data-ex="${ei}">+ série</button>
          <button class="btn small danger" data-acao="rem-serie" data-ex="${ei}" ${ex.series.length <= 1 ? 'disabled' : ''}>− série</button>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="section-head">
        <div>
          <strong>${esc(s.treinoNome)}</strong>
          <div class="muted">Em andamento desde ${new Date(s.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <span class="muted">${feitas}/${total} séries</span>
      </div>
      <div class="progress-bar"><div style="width:${pct}%"></div></div>
    </div>
    ${exercicios}
    <label>Observações
      <textarea id="obs-sessao" rows="2" placeholder="Como foi o treino?">${esc(s.obs || '')}</textarea>
    </label>
    <div class="row">
      <button class="btn danger" data-acao="cancelar-sessao">Descartar</button>
      <span class="spacer"></span>
      <button class="btn success" data-acao="finalizar">Finalizar treino</button>
    </div>`;
}

function iniciarSessao(treinoId) {
  const t = estado.treinos.find((x) => x.id === treinoId);
  if (!t) return;
  estado.ativa = {
    id: uid(),
    treinoId: t.id,
    treinoNome: t.nome,
    data: dataLocal(),
    inicio: Date.now(),
    obs: '',
    exercicios: t.exercicios.map((e) => ({
      exercicioId: e.id,
      nome: e.nome,
      descanso: e.descanso,
      series: Array.from({ length: e.series }, () => ({ reps: e.reps, carga: e.carga, feito: false })),
    })),
  };
  salvar();
  mostrarView('hoje');
}

$('#view-hoje').addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-acao]');
  if (!btn) return;
  const { acao, id } = btn.dataset;
  const ei = Number(btn.dataset.ex);
  const si = Number(btn.dataset.serie);
  const s = estado.ativa;

  if (acao === 'iniciar') return iniciarSessao(id);
  if (!s) return;

  if (acao === 'serie') {
    const serie = s.exercicios[ei].series[si];
    serie.feito = !serie.feito;
    if (serie.feito) iniciarTimer(s.exercicios[ei].descanso);
  } else if (acao === 'add-serie') {
    const ultima = s.exercicios[ei].series.at(-1) || { reps: 10, carga: 0 };
    s.exercicios[ei].series.push({ reps: ultima.reps, carga: ultima.carga, feito: false });
  } else if (acao === 'rem-serie') {
    if (s.exercicios[ei].series.length > 1) s.exercicios[ei].series.pop();
  } else if (acao === 'cancelar-sessao') {
    if (!await confirmar('Descartar este treino? O progresso desta sessão será perdido.', 'Descartar')) return;
    estado.ativa = null;
    pararTimer();
  } else if (acao === 'finalizar') {
    finalizarSessao();
    return;
  }
  salvar();
  renderHoje();
});

$('#view-hoje').addEventListener('input', (ev) => {
  const s = estado.ativa;
  if (!s) return;
  if (ev.target.id === 'obs-sessao') {
    s.obs = ev.target.value;
  } else if (ev.target.dataset.campo) {
    const { campo, ex, serie } = ev.target.dataset;
    s.exercicios[ex].series[serie][campo] = num(ev.target.value);
  }
  salvar();
});

async function finalizarSessao() {
  const s = estado.ativa;
  const feitas = s.exercicios.some((ex) => ex.series.some((x) => x.feito));
  if (!feitas && !await confirmar('Nenhuma série foi marcada como feita. Finalizar mesmo assim?', 'Finalizar')) return;

  s.fim = Date.now();
  estado.sessoes.unshift(s);
  estado.ativa = null;

  // Atualiza o treino com as cargas/reps usadas na última série concluída
  const treino = estado.treinos.find((t) => t.id === s.treinoId);
  if (treino) {
    s.exercicios.forEach((ex) => {
      const alvo = treino.exercicios.find((e) => e.id === ex.exercicioId);
      const ultima = ex.series.filter((x) => x.feito).at(-1);
      if (alvo && ultima) {
        alvo.carga = ultima.carga;
        alvo.reps = ultima.reps;
      }
    });
  }

  pararTimer();
  salvar();
  avisar(`Treino concluído! 💪 Volume total: ${volumeSessao(s).toLocaleString('pt-BR')} kg`);
  mostrarView('historico');
}

// ---------- Treinos (CRUD) ----------

function renderTreinos() {
  const el = $('#lista-treinos');
  if (!estado.treinos.length) {
    el.innerHTML = '<div class="card empty">Nenhum treino cadastrado ainda.</div>';
    return;
  }
  el.innerHTML = estado.treinos.map((t) => `
    <div class="card">
      <div class="section-head">
        <strong>${esc(t.nome)}</strong>
        <div class="row">
          <button class="btn small" data-acao="editar" data-id="${t.id}">Editar</button>
          <button class="btn small" data-acao="duplicar" data-id="${t.id}">Duplicar</button>
          <button class="btn small danger" data-acao="excluir" data-id="${t.id}">Excluir</button>
        </div>
      </div>
      <div class="chips">${DIAS.map((d, i) => `<span class="chip ${t.dias.includes(i) ? 'on' : ''}">${d}</span>`).join('')}</div>
      <ul class="ex-list">
        ${t.exercicios.map((e) => `<li>${esc(e.nome)} — <span class="muted">${e.series}×${e.reps} · ${e.carga} kg · ${e.descanso}s</span></li>`).join('')}
      </ul>
    </div>`).join('');
}

$('#lista-treinos').addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-acao]');
  if (!btn) return;
  const t = estado.treinos.find((x) => x.id === btn.dataset.id);
  if (!t) return;

  if (btn.dataset.acao === 'editar') {
    abrirFormTreino(t);
  } else if (btn.dataset.acao === 'duplicar') {
    const copia = structuredClone(t);
    copia.id = uid();
    copia.nome = `${t.nome} (cópia)`;
    copia.exercicios.forEach((e) => { e.id = uid(); });
    estado.treinos.push(copia);
    salvar();
    render();
  } else if (btn.dataset.acao === 'excluir') {
    if (!await confirmar(`Excluir "${t.nome}"? O histórico de sessões será mantido.`, 'Excluir')) return;
    estado.treinos = estado.treinos.filter((x) => x.id !== t.id);
    salvar();
    render();
  }
});

const dlg = $('#dlg-treino');
const form = $('#form-treino');
let editandoId = null;

$('#dias-semana').innerHTML = DIAS.map((d, i) =>
  `<label><input type="checkbox" name="dia" value="${i}" /> ${d}</label>`).join('');

function linhaExercicio(e = {}) {
  const div = document.createElement('div');
  div.className = 'ex-form';
  div.dataset.id = e.id || uid();
  div.innerHTML = `
    <label class="ex-nome">Exercício<input name="ex-nome" required maxlength="60" value="${esc(e.nome || '')}" placeholder="Nome" /></label>
    <label>Séries<input name="ex-series" type="number" min="1" max="20" required value="${e.series ?? 3}" /></label>
    <label>Reps<input name="ex-reps" type="number" min="1" max="100" required value="${e.reps ?? 10}" /></label>
    <label>Kg<input name="ex-carga" type="number" min="0" step="0.5" value="${e.carga ?? 0}" /></label>
    <label>Desc. (s)<input name="ex-descanso" type="number" min="0" step="5" value="${e.descanso ?? 60}" /></label>
    <button type="button" class="btn small danger" data-remover aria-label="Remover exercício">✕</button>`;
  return div;
}

function abrirFormTreino(t = null) {
  editandoId = t ? t.id : null;
  $('#dlg-treino-titulo').textContent = t ? 'Editar treino' : 'Novo treino';
  form.reset();
  form.nome.value = t ? t.nome : '';
  form.querySelectorAll('input[name="dia"]').forEach((cb) => {
    cb.checked = t ? t.dias.includes(Number(cb.value)) : false;
  });
  const lista = $('#exercicios-form');
  lista.innerHTML = '';
  (t ? t.exercicios : [{}]).forEach((e) => lista.appendChild(linhaExercicio(e)));
  dlg.showModal();
}

$('#btn-novo-treino').addEventListener('click', () => abrirFormTreino());
$('#btn-add-exercicio').addEventListener('click', () => {
  const linha = linhaExercicio();
  $('#exercicios-form').appendChild(linha);
  linha.querySelector('input').focus();
});
$('#btn-cancelar-treino').addEventListener('click', () => dlg.close());
$('#exercicios-form').addEventListener('click', (ev) => {
  if (ev.target.closest('[data-remover]')) ev.target.closest('.ex-form').remove();
});

form.addEventListener('submit', (ev) => {
  const nome = form.nome.value.trim();
  const linhas = [...form.querySelectorAll('.ex-form')];
  if (!nome || !linhas.length) {
    ev.preventDefault();
    avisar('Informe um nome e pelo menos um exercício.');
    return;
  }
  const treino = {
    id: editandoId || uid(),
    nome,
    dias: [...form.querySelectorAll('input[name="dia"]:checked')].map((cb) => Number(cb.value)),
    exercicios: linhas.map((l) => ({
      id: l.dataset.id,
      nome: l.querySelector('[name="ex-nome"]').value.trim(),
      series: Math.max(1, Math.round(num(l.querySelector('[name="ex-series"]').value))),
      reps: Math.max(1, Math.round(num(l.querySelector('[name="ex-reps"]').value))),
      carga: Math.max(0, num(l.querySelector('[name="ex-carga"]').value)),
      descanso: Math.max(0, Math.round(num(l.querySelector('[name="ex-descanso"]').value))),
    })),
  };
  const idx = estado.treinos.findIndex((t) => t.id === treino.id);
  if (idx >= 0) estado.treinos[idx] = treino;
  else estado.treinos.push(treino);
  salvar();
  render();
});

// ---------- Histórico ----------

function renderHistorico() {
  const el = $('#lista-historico');
  if (!estado.sessoes.length) {
    el.innerHTML = '<div class="card empty">Nenhum treino concluído ainda. Bora começar! 🚀</div>';
    return;
  }
  el.innerHTML = estado.sessoes.map((s) => {
    const feitas = s.exercicios.reduce((t, ex) => t + ex.series.filter((x) => x.feito).length, 0);
    const detalhes = s.exercicios.map((ex) => {
      const series = ex.series.filter((x) => x.feito);
      if (!series.length) return '';
      return `<li>${esc(ex.nome)} — <span class="muted">${series.map((x) => `${x.carga}kg×${x.reps}`).join(', ')}</span></li>`;
    }).join('');
    return `
      <details class="card">
        <summary class="section-head">
          <span><strong>${esc(s.treinoNome)}</strong><br>
            <span class="muted">${formatarData(s.data)} · ${formatarDuracao((s.fim || s.inicio) - s.inicio)} · ${feitas} séries · ${volumeSessao(s).toLocaleString('pt-BR')} kg</span>
          </span>
        </summary>
        <ul class="ex-list">${detalhes || '<li class="muted">Nenhuma série registrada.</li>'}</ul>
        ${s.obs ? `<p class="muted">📝 ${esc(s.obs)}</p>` : ''}
        <button class="btn small danger" data-acao="excluir-sessao" data-id="${s.id}">Excluir registro</button>
      </details>`;
  }).join('');
}

$('#lista-historico').addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-acao="excluir-sessao"]');
  if (!btn || !await confirmar('Excluir este registro do histórico?', 'Excluir')) return;
  estado.sessoes = estado.sessoes.filter((s) => s.id !== btn.dataset.id);
  salvar();
  render();
});

// ---------- Progresso ----------

function sequenciaSemanas() {
  // Semanas consecutivas (até a atual) com pelo menos um treino
  const semanaDe = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    const dt = new Date(a, m - 1, d);
    dt.setDate(dt.getDate() - dt.getDay());
    return dataLocal(dt);
  };
  const semanas = new Set(estado.sessoes.map((s) => semanaDe(s.data)));
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - cursor.getDay());
  if (!semanas.has(dataLocal(cursor))) cursor.setDate(cursor.getDate() - 7);
  let n = 0;
  while (semanas.has(dataLocal(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return n;
}

function renderProgresso() {
  const s = estado.sessoes;
  const ha30 = dataLocal(new Date(Date.now() - 30 * 86400000));
  const ultimos30 = s.filter((x) => x.data >= ha30);
  const volumeTotal = s.reduce((t, x) => t + volumeSessao(x), 0);

  $('#stats').innerHTML = [
    [s.length, 'treinos concluídos'],
    [ultimos30.length, 'nos últimos 30 dias'],
    [sequenciaSemanas(), 'semanas seguidas'],
    [volumeTotal >= 1000
      ? `${(volumeTotal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`
      : `${volumeTotal.toLocaleString('pt-BR')} kg`, 'volume total'],
  ].map(([v, l]) => `<div class="stat"><strong>${v}</strong><span>${l}</span></div>`).join('');

  const select = $('#select-exercicio');
  const nomes = [...new Set(s.flatMap((x) => x.exercicios.filter((e) => e.series.some((y) => y.feito)).map((e) => e.nome)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const atual = select.value;
  select.innerHTML = nomes.length
    ? nomes.map((n) => `<option ${n === atual ? 'selected' : ''}>${esc(n)}</option>`).join('')
    : '<option>—</option>';
  renderGrafico(nomes.length ? select.value : null);
}

$('#select-exercicio').addEventListener('change', (ev) => renderGrafico(ev.target.value));

function renderGrafico(nome) {
  const el = $('#grafico');
  if (!nome) {
    el.innerHTML = '<p class="empty">Conclua treinos para ver sua evolução de carga.</p>';
    return;
  }
  // Maior carga concluída por dia para o exercício
  const porData = new Map();
  estado.sessoes.forEach((s) => s.exercicios.forEach((ex) => {
    if (ex.nome !== nome) return;
    ex.series.filter((x) => x.feito).forEach((x) => {
      porData.set(s.data, Math.max(porData.get(s.data) ?? 0, x.carga));
    });
  }));
  const pontos = [...porData.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (!pontos.length) {
    el.innerHTML = '<p class="empty">Nenhuma série concluída para este exercício.</p>';
    return;
  }

  const W = 600, H = 240, P = { t: 20, r: 20, b: 36, l: 56 };
  const vals = pontos.map(([, v]) => v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min = Math.max(0, min - 5); max += 5; }
  const x = (i) => P.l + (pontos.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (pontos.length - 1));
  const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const path = pontos.map(([, v], i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const labelData = (iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };
  const ticks = [min, (min + max) / 2, max];

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução de carga de ${esc(nome)}">
      ${ticks.map((t) => `
        <line class="eixo" x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" />
        <text x="${P.l - 6}" y="${y(t) + 4}" text-anchor="end">${Math.round(t * 10) / 10}</text>`).join('')}
      <path class="linha" d="${path}" />
      ${pontos.map(([d, v], i) => `<circle class="ponto" cx="${x(i)}" cy="${y(v)}" r="4"><title>${labelData(d)}: ${v} kg</title></circle>`).join('')}
      <text x="${x(0)}" y="${H - 8}" text-anchor="start">${labelData(pontos[0][0])}</text>
      ${pontos.length > 1 ? `<text x="${x(pontos.length - 1)}" y="${H - 8}" text-anchor="end">${labelData(pontos.at(-1)[0])}</text>` : ''}
    </svg>
    <p class="muted">Carga máxima por sessão (kg). Recorde: <strong>${Math.max(...vals)} kg</strong></p>`;
}

// ---------- Timer de descanso ----------

let timerFim = 0;
let timerIntervalo = null;

function iniciarTimer(segundos) {
  if (!segundos) return;
  timerFim = Date.now() + segundos * 1000;
  $('#timer').classList.remove('hidden');
  clearInterval(timerIntervalo);
  timerIntervalo = setInterval(tickTimer, 250);
  tickTimer();
}

function tickTimer() {
  const resta = Math.max(0, Math.ceil((timerFim - Date.now()) / 1000));
  $('#timer-valor').textContent = `${String(Math.floor(resta / 60)).padStart(2, '0')}:${String(resta % 60).padStart(2, '0')}`;
  if (resta === 0) {
    pararTimer();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    bip();
  }
}

function pararTimer() {
  clearInterval(timerIntervalo);
  timerIntervalo = null;
  $('#timer').classList.add('hidden');
}

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* áudio indisponível */ }
}

$('#btn-timer-mais').addEventListener('click', () => { timerFim += 15000; tickTimer(); });
$('#btn-timer-parar').addEventListener('click', pararTimer);

// ---------- Backup ----------

$('#btn-copiar').addEventListener('click', async () => {
  const json = JSON.stringify(estado, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    avisar('Dados copiados. Cole em um arquivo .json para guardar.');
  } catch {
    avisar('Não foi possível copiar automaticamente. Use "Exportar JSON".');
  }
});

$('#btn-exportar').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `treinos-${dataLocal()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#input-importar').addEventListener('change', async (ev) => {
  const arquivo = ev.target.files[0];
  ev.target.value = '';
  if (!arquivo) return;
  try {
    const dados = JSON.parse(await arquivo.text());
    if (!Array.isArray(dados.treinos) || !Array.isArray(dados.sessoes)) throw new Error('formato inválido');
    if (!await confirmar('Importar vai substituir todos os dados atuais. Continuar?', 'Importar')) return;
    estado = { treinos: dados.treinos, sessoes: dados.sessoes, ativa: dados.ativa ?? null };
    salvar();
    render();
    avisar('Dados importados com sucesso!');
  } catch (e) {
    avisar(`Não foi possível importar o arquivo: ${e.message}`);
  }
});

render();
