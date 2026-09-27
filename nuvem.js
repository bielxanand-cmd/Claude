'use strict';

// Sincronização entre aparelhos.
// Quando o app roda publicado no claude.ai, os dados ficam na conta do usuário
// (área privada data/users/<id>/) e aparecem no computador e no celular.
// Fora do claude.ai o app continua salvando só no navegador.

const nuvem = {
  pronto: false,
  sujo: false,
  timer: null,
  fila: Promise.resolve(),
  rotinaRef: null,
  sessoesRef: null,
  uid: null,
  // O que a nuvem tem agora (JSON canônico), para enviar só o que mudou
  naNuvem: { rotina: null, sessoes: new Map() },
  recebido: { rotina: undefined, sessoes: undefined },
};

// Havia dados salvos neste aparelho antes de conectar? (app.js ainda não salvou nada nesta visita)
let dadosLocaisReais = (() => {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
})();

const CHAVE_SINCRONIZADO = `${STORAGE_KEY}:nuvem`;

// JSON com chaves ordenadas, para comparar estados independentemente da ordem
function canon(v) {
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : canon(x))).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

const corpoRotina = (e) => ({ treinos: e.treinos, ativa: e.ativa ?? null });
const ordenarSessoes = (lista) => [...lista].sort((a, b) => (b.fim || b.inicio) - (a.fim || a.inicio));
const limpo = (obj) => JSON.parse(JSON.stringify(obj));

function statusNuvem(texto, tipo) {
  const el = $('#status-nuvem');
  el.textContent = texto;
  el.dataset.tipo = tipo;
  el.hidden = false;
}

// Chamado por salvar() em app.js a cada alteração feita pelo usuário
function aoSalvar() {
  dadosLocaisReais = true;
  if (!nuvem.pronto) return;
  nuvem.sujo = true;
  statusNuvem('Salvando…', 'salvando');
  clearTimeout(nuvem.timer);
  nuvem.timer = setTimeout(() => { nuvem.timer = null; enviar(); }, 800);
}

function enviar() {
  nuvem.fila = nuvem.fila.then(async () => {
    const rotina = corpoRotina(estado);
    if (canon(rotina) !== nuvem.naNuvem.rotina) {
      await nuvem.rotinaRef.set(limpo({ ...rotina, atualizadoEm: Date.now() }));
      nuvem.naNuvem.rotina = canon(rotina);
    }
    const atuais = new Map(estado.sessoes.map((s) => [s.id, s]));
    for (const [id, s] of atuais) {
      const json = canon(s);
      if (nuvem.naNuvem.sessoes.get(id) !== json) {
        await nuvem.sessoesRef.doc(id).set(limpo(s));
        nuvem.naNuvem.sessoes.set(id, json);
      }
    }
    for (const id of [...nuvem.naNuvem.sessoes.keys()]) {
      if (!atuais.has(id)) {
        await nuvem.sessoesRef.doc(id).delete();
        nuvem.naNuvem.sessoes.delete(id);
      }
    }
  }).then(() => {
    if (!nuvem.timer) {
      nuvem.sujo = false;
      statusNuvem('Sincronizado', 'ok');
    }
  }, (e) => {
    console.warn('Falha ao sincronizar:', e);
    if (e?.code === 'invalid_argument') {
      statusNuvem('Sem permissão para salvar na nuvem', 'erro');
    } else if (e?.code === 'quota_exceeded') {
      statusNuvem('Espaço na nuvem esgotado', 'erro');
    } else {
      statusNuvem('Sem conexão. Tentando de novo…', 'erro');
      clearTimeout(nuvem.timer);
      nuvem.timer = setTimeout(() => { nuvem.timer = null; enviar(); }, 5000);
    }
  });
}

function adotarNuvem(rotina, sessoes) {
  // Snapshots chegam congelados; o app altera o estado no lugar, então trabalha com cópias
  rotina = rotina ? limpo(rotina) : rotina;
  sessoes = limpo(sessoes);
  const novo = {
    treinos: rotina?.treinos ?? estado.treinos,
    sessoes: ordenarSessoes(sessoes),
    ativa: rotina ? rotina.ativa ?? null : estado.ativa,
  };
  if (canon(novo) === canon(estado)) return;
  estado = novo;
  salvarLocal();
  render();
}

function primeiraSincronizacao() {
  const rotina = nuvem.recebido.rotina ? limpo(nuvem.recebido.rotina) : null;
  const sessoes = limpo(nuvem.recebido.sessoes);
  let jaSincronizou = false;
  try { jaSincronizou = localStorage.getItem(CHAVE_SINCRONIZADO) === nuvem.uid; } catch { /* sem storage */ }
  nuvem.pronto = true;

  const nuvemVazia = !rotina && !sessoes.length;
  if (nuvemVazia) {
    // Primeiro aparelho a conectar: sobe o que já existe aqui
    if (dadosLocaisReais) enviar();
    else statusNuvem('Sincronizado', 'ok');
  } else if (dadosLocaisReais && !jaSincronizou) {
    // Aparelho com dados próprios encontrando a nuvem já preenchida: junta os dois
    const idsNuvem = new Set((rotina?.treinos || []).map((t) => t.id));
    const nomesNuvem = new Set((rotina?.treinos || []).map((t) => normalizar(t.nome)));
    const treinos = [
      ...(rotina?.treinos || []),
      ...estado.treinos.filter((t) => !idsNuvem.has(t.id) && !nomesNuvem.has(normalizar(t.nome))),
    ];
    const idsSessoes = new Set(sessoes.map((s) => s.id));
    estado = {
      treinos,
      sessoes: ordenarSessoes([...sessoes, ...estado.sessoes.filter((s) => !idsSessoes.has(s.id))]),
      ativa: rotina?.ativa ?? estado.ativa,
    };
    salvarLocal();
    render();
    enviar();
  } else {
    adotarNuvem(rotina, sessoes);
    statusNuvem('Sincronizado', 'ok');
  }
  try { localStorage.setItem(CHAVE_SINCRONIZADO, nuvem.uid); } catch { /* sem storage */ }
}

function aoReceber() {
  const { rotina, sessoes } = nuvem.recebido;
  if (rotina === undefined || sessoes === undefined) return;
  if (!nuvem.pronto) return primeiraSincronizacao();
  if (nuvem.sujo) return; // alterações locais ainda não enviadas têm prioridade
  adotarNuvem(rotina, sessoes);
}

function erroNuvem(e) {
  console.warn('Sincronização interrompida:', e);
  statusNuvem('Sincronização indisponível. Salvando neste aparelho', 'erro');
}

(async () => {
  if (!window.claude?.use) {
    statusNuvem('Salvo só neste navegador', 'local');
    return;
  }
  statusNuvem('Conectando…', 'salvando');
  const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
  const uid = user ? await user.id() : null;
  if (!db || !uid) {
    statusNuvem('Salvo só neste aparelho', 'local');
    return;
  }
  nuvem.uid = uid;
  nuvem.rotinaRef = db.doc(`data/users/${uid}/rotina`);
  nuvem.sessoesRef = nuvem.rotinaRef.collection('sessoes');

  nuvem.rotinaRef.onSnapshot((snap) => {
    if (!nuvem.pronto && snap.metadata.fromCache) return; // decide só com o estado real do servidor
    const d = snap.exists ? snap.data() : null;
    nuvem.recebido.rotina = d;
    nuvem.naNuvem.rotina = d ? canon(corpoRotina(d)) : null;
    aoReceber();
  }, erroNuvem);

  nuvem.sessoesRef.onSnapshot((snap) => {
    if (!nuvem.pronto && snap.metadata.fromCache) return;
    const lista = snap.docs.map((d) => d.data());
    nuvem.recebido.sessoes = lista;
    nuvem.naNuvem.sessoes = new Map(lista.map((s) => [s.id, canon(s)]));
    aoReceber();
  }, erroNuvem);
})();
